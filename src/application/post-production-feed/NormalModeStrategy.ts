import { decideSlotBinding } from "@/domain/slot/SlotBindingRules"
import { PostProductionFeedContext, MaterialScanResult } from "./PostProductionFeedContext"
import { PostProductionFeedStrategyBase } from "./PostProductionFeedStrategy"
import { RowModelBase } from "./PostProductionFeedTypes"
import { MODE_NAME_NORMAL } from "./PostProductionFeedConstants"

export class NormalModeStrategy<TRow extends RowModelBase> extends PostProductionFeedStrategyBase<TRow> {
    async submit(ctx: PostProductionFeedContext): Promise<boolean> {
        const { result, slot, subSlot, slotIdno } = ctx

        if (!result) return this.deps.ui.warn("請先掃描物料條碼")

        const matchedRows = result.matchedRows || []
        const bindingDecision = decideSlotBinding(
            { slotIdno: slot, subSlotIdno: subSlot },
            matchedRows
        )

        if (bindingDecision.kind === "no_allowed_slots") {
            return this.deps.ui.warn("此物料未匹配任何槽位")
        }

        if (bindingDecision.kind === "match") {
            const rowNode = this.deps.grid.getRowNode(
                bindingDecision.matchedSlotIdno
            )

            if (!rowNode) {
                await this.deps.ui.error(`找不到物料槽位 ${slotIdno}`)
                return false
            }

            this.deps.grid.cleanErrorMaterialInventory(
                result.materialInventory?.idno ?? "",
                slot,
                subSlot
            )

            this.deps.clearMaterialResult()
            this.deps.setCorrectState("true")

            await this.deps.ui.success(
                `${MODE_NAME_NORMAL}：槽位 ${slotIdno} 綁定成功`
            )
            return true
        }

        await this.handleMistmatch(
            slot,
            subSlot,
            bindingDecision.suggestedSlotIdno
        )
        this.deps.clearMaterialResult()
        this.deps.setCorrectState("false")
        return false
    }
}
