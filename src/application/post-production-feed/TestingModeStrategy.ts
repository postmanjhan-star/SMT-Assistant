import {
    decideSlotBinding,
    TESTING_FORCE_BIND_REMARK,
} from "@/domain/slot/SlotBindingRules"
import { PostProductionFeedContext } from "./PostProductionFeedContext"
import { PostProductionFeedStrategyBase } from "./PostProductionFeedStrategy"
import { RowModelBase } from "./PostProductionFeedTypes"
import { MODE_NAME_TESTING } from "./PostProductionFeedConstants"

export class TestingModeStrategy<TRow extends RowModelBase> extends PostProductionFeedStrategyBase<TRow> {
    async submit(ctx: PostProductionFeedContext): Promise<boolean> {
        const { result, slot, subSlot, slotIdno } = ctx

        if (!result) {
            this.deps.ui.warn("請先掃描物料條碼")
            return false
        }

        const matchedRows = result.matchedRows || []
        const rowNode = this.deps.grid.getRowNode(`${slot}-${subSlot}`)

        if (!rowNode) {
            await this.deps.ui.error(`找不到的輸入槽位 ${slotIdno}`)
            return false
        }

        if (matchedRows.length !== 0) {
            const bindingDecision = decideSlotBinding(
                { slotIdno: slot, subSlotIdno: subSlot },
                matchedRows
            )

            if (bindingDecision.kind === "match") {
                const materialRowNode = this.deps.grid.getRowNode(
                    bindingDecision.matchedSlotIdno
                )

                if (!materialRowNode) {
                    await this.deps.ui.error(`找不到物料槽位 ${slotIdno}`)
                    return false
                }

                this.deps.grid.cleanErrorMaterialInventory(
                    result.materialInventory?.idno ?? "",
                    slot,
                    subSlot
                )

                this.deps.setCorrectState("true")
                this.deps.clearMaterialResult()

                await this.deps.ui.success(
                    `${MODE_NAME_TESTING}：槽位 ${slotIdno} 綁定成功`
                )

                return true
            }

            await this.handleMistmatch(
                slot,
                subSlot,
                bindingDecision.kind === "mismatch"
                    ? bindingDecision.suggestedSlotIdno
                    : `${slot}-${subSlot}`
            )
            this.deps.setCorrectState("false")
            this.deps.clearMaterialResult()
            return false
        }

        const testRemark = TESTING_FORCE_BIND_REMARK
        this.deps.clearMaterialResult()

        await this.deps.ui.success(
            `${MODE_NAME_TESTING}：槽位 ${slotIdno} 已標記為 ${testRemark}`
        )

        this.deps.setCorrectState("warning")

        return true
    }
}
