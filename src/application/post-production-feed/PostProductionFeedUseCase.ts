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
import { NormalModeStrategy } from "./NormalModeStrategy"
import { TestingModeStrategy } from "./TestingModeStrategy"

export class PostProductionFeedUseCase<TRow extends RowModelBase> {
    private normalStrategy: NormalModeStrategy<TRow>
    private testingStrategy: TestingModeStrategy<TRow>

    constructor(private deps: PostProductionFeedDeps<TRow>) {
        this.normalStrategy = new NormalModeStrategy(deps)
        this.testingStrategy = new TestingModeStrategy(deps)
    }

    async execute(ctx: PostProductionFeedContext): Promise<void> {
        const { slot, subSlot, slotIdno, result } = ctx
        let success = false

        const stat = this.deps.getMounterData().find(
            stat =>
                stat.slot_idno === slot &&
                (stat.sub_slot_idno ?? "") === subSlot
        )

        if (!stat) {
            await this.deps.ui.error(`找不到槽位 ${slotIdno}`)
            return
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

                    await this.deps.ui.success(`巡檢通過：${slotIdno}`)

                    const row = this.deps.grid.getRow(slot, subSlot)

                    if (!row) {
                        await this.deps.ui.error(`找不到槽位 ${slotIdno}`)
                        return
                    }

                    this.deps.grid.applyInspectionUpdate(row, result.materialInventory.idno)
                    return
                }
            }

            if (this.deps.isProductionStarted() && result?.materialInventory) {
                const loadedSlot = findLoadedSlotByPack({
                    stats: this.deps.getMounterData().map(stat => this.toStatLike(stat)),
                    importPackType: FeedMaterialTypeEnum.IMPORTED_MATERIAL_PACK,
                    inputPackIdno: result.materialInventory.idno,
                })

                if (loadedSlot) {
                    await this.deps.ui.error(
                        `巡檢失敗：此料號位於 ${formatSlotId(loadedSlot)}，非 ${slotIdno}`
                    )
                    return
                }
            }
        }

        if (this.deps.isTestingMode()) {
            success = await this.testingStrategy.submit(ctx)
        } else {
            success = await this.normalStrategy.submit(ctx)
        }

        if (!success) return

        await this.deps.appendedMaterialUpload({
            stat_id: stat.id,
            inputSlot: slot,
            inputSubSlot: subSlot,
            materialInventory: result?.materialInventory,
            correctState: this.deps.getCorrectState(),
        })

        const row = this.deps.grid.getRow(slot, subSlot)

        if (!row) {
            await this.deps.ui.error(`找不到槽位 ${slotIdno}`)
            return
        }

        const rowId = this.deps.grid.getRowId(row)
        const newAppendedIdno = appendMaterialCode(
            row.appendedMaterialInventoryIdno,
            result?.materialInventory?.idno
        )

        const updated = this.deps.grid.setAppendedMaterialInventoryIdno(
            rowId,
            newAppendedIdno
        )

        if (!updated) {
            await this.deps.ui.error(`找不到AG Grid 資料列 ${rowId}`)
        }
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
