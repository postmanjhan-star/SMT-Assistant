import { FeedMaterialTypeEnum, PanasonicMounterItemStatRead } from "@/client"
import {
    appendMaterialCode,
    findLoadedSlotByPack,
    formatSlotId,
    isInspectionScan,
    StatLike,
} from "@/domain/production/PostProductionFeedRules"
import { PostProductionFeedContext } from "./PostProductionFeedContext"
import { PostProductionFeedDeps } from "./PostProductionFeedDeps"
import { RowModelBase } from "./PostProductionFeedTypes"
import { PostProductionFeedStrategy } from "./PostProductionFeedStrategy"

export class PostProductionFeedUseCase<TRow extends RowModelBase> {
    constructor(
        private deps: PostProductionFeedDeps,
        private getStrategy: () => PostProductionFeedStrategy
    ) {}

    async execute(ctx: PostProductionFeedContext): Promise<boolean> {
        const { slot, subSlot, slotIdno, result } = ctx
        let success = false

        const stat = this.deps.getMounterData().find(
            stat =>
                stat.slot_idno === slot &&
                (stat.sub_slot_idno ?? "") === subSlot
        )

        if (!stat) {
            await this.deps.store.error(`找不到槽位 ${slotIdno}`)
            return false
        }

        if (!this.deps.isTestingMode()) {
            if (result?.materialInventory) {
                const inspection = isInspectionScan({
                    productionStarted: this.deps.isProductionStarted(),
                    stat: this.toStatLike(stat),
                    importPackType: FeedMaterialTypeEnum.IMPORTED_MATERIAL_PACK,
                    inputPackIdno: result.materialInventory.idno,
                })

                if (inspection) {
                    await this.deps.inspectionUpload({
                        stat_id: stat.id,
                        inputSlot: slot,
                        inputSubSlot: subSlot,
                        materialInventory: result.materialInventory,
                    })

                    this.deps.resetMaterialScan()

                    await this.deps.store.success(`巡檢通過：${slotIdno}`)

                    const row = this.deps.store.getRow(slot, subSlot)

                    if (!row) {
                        await this.deps.store.error(`找不到槽位 ${slotIdno}`)
                        return false
                    }

                    this.deps.store.applyInspectionUpdate(
                        row,
                        result.materialInventory.idno
                    )
                    return true
                }
            }

            if (this.deps.isProductionStarted() && result?.materialInventory) {
                const loadedSlot = findLoadedSlotByPack({
                    stats: this.deps.getMounterData().map(stat => this.toStatLike(stat)),
                    importPackType: FeedMaterialTypeEnum.IMPORTED_MATERIAL_PACK,
                    inputPackIdno: result.materialInventory.idno,
                })

                if (loadedSlot) {
                    await this.deps.store.error(
                        `巡檢失敗：此料號位於 ${formatSlotId(loadedSlot)}，非 ${slotIdno}`
                    )
                    return false
                }
            }
        }

        const strategy = this.getStrategy()
        success = await strategy.submit(ctx)

        if (!success) return false

        await this.deps.appendedMaterialUpload({
            stat_id: stat.id,
            inputSlot: slot,
            inputSubSlot: subSlot,
            materialInventory: result?.materialInventory,
            correctState: this.deps.store.getCorrectState(),
        })

        const row = this.deps.store.getRow(slot, subSlot)

        if (!row) {
            await this.deps.store.error(`找不到槽位 ${slotIdno}`)
            return false
        }

        const rowId = this.deps.store.getRowId(row)
        const newAppendedIdno = appendMaterialCode(
            row.appendedMaterialInventoryIdno,
            result?.materialInventory?.idno
        )

        const updated = this.deps.store.setAppendedMaterialInventoryIdno(
            rowId,
            newAppendedIdno
        )

        if (!updated) {
            await this.deps.store.error(`找不到AG Grid 資料列 ${rowId}`)
            return false
        }

        return true
    }

    private toStatLike(stat: PanasonicMounterItemStatRead): StatLike {
        return {
            slotIdno: stat.slot_idno,
            subSlotIdno: stat.sub_slot_idno ?? null,
            feedRecords:
                stat.feed_records?.map(record => ({
                    feedMaterialPackType: record.feed_material_pack_type,
                    materialPackCode: record.material_pack_code,
                })) ?? [],
        }
    }

}
