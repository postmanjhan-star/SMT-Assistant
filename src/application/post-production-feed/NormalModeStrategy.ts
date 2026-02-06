import { decideSlotBinding } from "@/domain/slot/SlotBindingRules"
import { PostProductionFeedContext } from "./PostProductionFeedContext"
import { PostProductionFeedStrategyBase } from "./PostProductionFeedStrategy"
import { MODE_NAME_NORMAL } from "./PostProductionFeedConstants"

export class NormalModeStrategy extends PostProductionFeedStrategyBase {
    async submit(ctx: PostProductionFeedContext): Promise<boolean> {
        const { result, slot, subSlot, slotIdno } = ctx

        if (!result) return this.deps.store.warn("請先掃描物料條碼")

        const matchedRows = result.matchedRows || []
        const bindingDecision = decideSlotBinding(
            { slotIdno: slot, subSlotIdno: subSlot },
            matchedRows
        )

        if (bindingDecision.kind === "no_allowed_slots") {
            return this.deps.store.warn("此物料未匹配任何槽位")
        }

        if (bindingDecision.kind === "match") {
            const rowNode = this.deps.store.getRowNode(
                bindingDecision.matchedSlotIdno
            )

            if (!rowNode) {
                await this.deps.store.error(`找不到物料槽位 ${slotIdno}`)
                return false
            }

            this.deps.store.cleanErrorMaterialInventory(
                result.materialInventory?.idno ?? "",
                slot,
                subSlot
            )

            this.deps.store.clearMaterialResult()
            this.deps.store.setCorrectState("true")

            await this.deps.store.success(
                `${MODE_NAME_NORMAL}：槽位 ${slotIdno} 綁定成功`
            )
            return true
        }

        await this.handleMistmatch(
            slot,
            subSlot,
            bindingDecision.suggestedSlotIdno
        )
        this.deps.store.clearMaterialResult()
        this.deps.store.setCorrectState("false")
        return false
    }
}
