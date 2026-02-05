import { FeedMaterialTypeEnum, PanasonicMounterItemStatRead } from "@/client"
import {
    appendMaterialCode,
    findLoadedSlotByPack,
    formatSlotId,
    isInspectionScan,
    StatLike,
} from "@/domain/production/PostProductionFeedRules"
import {
    decideSlotBinding,
    TESTING_FORCE_BIND_REMARK,
} from "@/domain/slot/SlotBindingRules"
import { PostProductionFeedContext, MaterialScanResult } from "./PostProductionFeedContext"
import { PostProductionFeedDeps, RowModelBase } from "./PostProductionFeedDeps"

export class PostProductionFeedUseCase<TRow extends RowModelBase> {
    constructor(private deps: PostProductionFeedDeps<TRow>) {}

    async execute(ctx: PostProductionFeedContext): Promise<void> {
        const { slot, subSlot, slotIdno, result } = ctx
        let success = false

        const stat = this.deps.getMounterData().find(
            stat =>
                stat.slot_idno === slot &&
                (stat.sub_slot_idno ?? "") === subSlot
        )

        if (!stat) {
            await this.deps.showError(`找不到槽位 ${slotIdno}`)
            return
        }

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

                await this.deps.showSuccess(`巡檢通過：${slotIdno}`)

                const row = this.getRow(slot, subSlot)

                if (!row) {
                    await this.deps.showError(`找不到槽位 ${slotIdno}`)
                    return
                }

                row.inspectMaterialPackCode = result.materialInventory.idno
                row.inspectTime = new Date().toISOString()

                row.inspectCount = (row.inspectCount ?? 0) + 1
                row.remark = `巡檢 ${row.inspectCount} 次`

                this.getGridApi().applyTransaction({
                    update: [row],
                })
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
                await this.deps.showError(
                    `巡檢失敗：此料號位於 ${formatSlotId(loadedSlot)}，非 ${slotIdno}`
                )
                return
            }
        }

        if (this.deps.isTestingMode()) {
            success = await this.handleTestingMode(result, slot, subSlot, slotIdno)
        } else {
            success = await this.handleNormalMode(result, slot, subSlot, slotIdno)
        }

        if (!success) return

        await this.deps.appendedMaterialUpload({
            stat_id: stat.id,
            inputSlot: slot,
            inputSubSlot: subSlot,
            materialInventory: result?.materialInventory,
            correctState: this.deps.getCorrectState(),
        })

        const row = this.getRow(slot, subSlot)

        if (!row) {
            await this.deps.showError(`找不到槽位 ${slotIdno}`)
            return
        }

        const rowId = `${row.slotIdno}-${row.subSlotIdno ?? ""}`
        const newAppendedIdno = appendMaterialCode(
            row.appendedMaterialInventoryIdno,
            result?.materialInventory?.idno
        )

        const materialRowNode = this.getGridApi().getRowNode(rowId)
        if (!materialRowNode) {
            await this.deps.showError(`找不到AG Grid 資料列 ${rowId}`)
            return
        }

        materialRowNode.setDataValue(
            "appendedMaterialInventoryIdno",
            newAppendedIdno
        )
    }

    private getRow(slot: string, subSlot: string): TRow | undefined {
        return this.deps
            .getRowData()
            .find(r => r.slotIdno === slot && (r.subSlotIdno ?? "") === subSlot)
    }

    private getGridApi() {
        return this.deps.getGridApi()
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

    private cleanErrorMaterialInventory(
        currentPackCode: string,
        inputSlot: string,
        inputSubSlot: string
    ) {
        if (!currentPackCode) return
        this.getGridApi().forEachNode((node) => {
            const isSame = node.data.materialInventoryIdno === currentPackCode
            const isDifferentSlot =
                `${node.data.slotIdno}-${node.data.subSlotIdno}` !==
                `${inputSlot}-${inputSubSlot}`
            const isCorrect = node.data.correct === "true"

            if (isSame && isDifferentSlot && !isCorrect) {
                node.setDataValue("materialInventoryIdno", "")
                node.setDataValue("correct", "")
                node.setDataValue("remark", "")
                node.setDataValue("firstAppendTime", null)
            }
        })
    }

    private async handleMistmatch(
        inputSlot: string,
        inputSubSlot: string,
        materialRowNode: any
    ) {
        const inputSlotIdno = formatSlotId({
            slotIdno: inputSlot,
            subSlotIdno: inputSubSlot,
        })

        materialRowNode.setSelected(false)

        await this.deps.playErrorTone()
        this.deps.notifyError(`錯誤的槽位 ${inputSlotIdno}`)
        this.deps.resetSlotMaterialFormInputs()
    }

    private async handleNormalMode(
        result: MaterialScanResult | null,
        inputSlot: string,
        inputSubSlot: string,
        inputSlotIdno: string
    ): Promise<boolean> {
        if (!result) return this.deps.showWarn("請先掃描物料條碼")

        const matchedRows = result.matchedRows || []
        const bindingDecision = decideSlotBinding(
            { slotIdno: inputSlot, subSlotIdno: inputSubSlot },
            matchedRows
        )

        if (bindingDecision.kind === "no_allowed_slots") {
            return this.deps.showWarn("此物料未匹配任何槽位")
        }

        if (bindingDecision.kind === "match") {
            const rowNode = this.getGridApi().getRowNode(
                bindingDecision.matchedSlotIdno
            )

            if (!rowNode) {
                await this.deps.showError(`找不到物料槽位 ${inputSlotIdno}`)
                return false
            }

            this.cleanErrorMaterialInventory(
                result.materialInventory?.idno ?? "",
                inputSlot,
                inputSubSlot
            )

            this.deps.clearMaterialResult()
            this.deps.setCorrectState("true")

            await this.deps.showSuccess(
                `${MODE_NAME_NORMAL}：槽位 ${inputSlotIdno} 綁定成功`
            )
            return true
        }

        const rowNode = this.getGridApi().getRowNode(
            bindingDecision.suggestedSlotIdno
        )
        await this.handleMistmatch(inputSlot, inputSubSlot, rowNode)
        this.deps.clearMaterialResult()
        this.deps.setCorrectState("false")
        return false
    }

    private async handleTestingMode(
        result: MaterialScanResult | null,
        inputSlot: string,
        inputSubSlot: string,
        inputSlotIdno: string
    ): Promise<boolean> {
        if (!result) {
            this.deps.showWarn("請先掃描物料條碼")
            return false
        }

        const matchedRows = result.matchedRows || []
        const rowNode = this.getGridApi().getRowNode(
            `${inputSlot}-${inputSubSlot}`
        )

        if (!rowNode) {
            await this.deps.showError(`找不到的輸入槽位 ${inputSlotIdno}`)
            return false
        }

        if (matchedRows.length !== 0) {
            const bindingDecision = decideSlotBinding(
                { slotIdno: inputSlot, subSlotIdno: inputSubSlot },
                matchedRows
            )

            if (bindingDecision.kind === "match") {
                const materialRowNode = this.getGridApi().getRowNode(
                    bindingDecision.matchedSlotIdno
                )

                if (!materialRowNode) {
                    await this.deps.showError(`找不到物料槽位 ${inputSlotIdno}`)
                    return false
                }

                this.cleanErrorMaterialInventory(
                    result.materialInventory?.idno ?? "",
                    inputSlot,
                    inputSubSlot
                )

                this.deps.setCorrectState("true")
                this.deps.clearMaterialResult()

                await this.deps.showSuccess(
                    `${MODE_NAME_TESTING}：槽位 ${inputSlotIdno} 綁定成功`
                )

                return true
            }

            const materialRowNode = this.getGridApi().getRowNode(
                bindingDecision.kind === "mismatch"
                    ? bindingDecision.suggestedSlotIdno
                    : `${inputSlot}-${inputSubSlot}`
            )
            await this.handleMistmatch(inputSlot, inputSubSlot, materialRowNode)
            this.deps.setCorrectState("false")
            this.deps.clearMaterialResult()
            return false
        }

        const testRemark = TESTING_FORCE_BIND_REMARK
        this.deps.clearMaterialResult()

        await this.deps.showSuccess(
            `${MODE_NAME_TESTING}：槽位 ${inputSlotIdno} 已標記為 ${testRemark}`
        )

        this.deps.setCorrectState("warning")

        return true
    }
}

const MODE_NAME_TESTING = "🧪 試產生產模式"
const MODE_NAME_NORMAL = "✅ 正式生產模式"
