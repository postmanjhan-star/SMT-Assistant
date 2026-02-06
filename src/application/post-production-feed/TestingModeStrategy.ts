import { decideTestingSlotBinding } from "@/domain/slot/SlotBindingRules"
import { PostProductionFeedContext } from "./PostProductionFeedContext"
import { PostProductionFeedStrategyBase } from "./PostProductionFeedStrategy"
import { MODE_NAME_TESTING } from "./PostProductionFeedConstants"

export class TestingModeStrategy extends PostProductionFeedStrategyBase {
    async submit(ctx: PostProductionFeedContext): Promise<boolean> {
        const { result, slot, subSlot, slotIdno } = ctx

        if (!result) {
            this.deps.store.warn("請先掃描物料條碼")
            return false
        }

        const matchedRows = result.matchedRows || []
        const rowNode = this.deps.store.getRowNode(`${slot}-${subSlot}`)

        if (!rowNode) {
            await this.deps.store.error(`找不到的輸入槽位 ${slotIdno}`)
            return false
        }


        const bindingDecision = decideTestingSlotBinding(
            { slotIdno: slot, subSlotIdno: subSlot },
            matchedRows
        )

        if (bindingDecision.kind === "match") {
            const materialRowNode = this.deps.store.getRowNode(
                bindingDecision.matchedSlotIdno
            )

            if (!materialRowNode) {
                await this.deps.store.error(`錯誤的槽位 ${slotIdno}`)
                return false
            }

            this.deps.store.cleanErrorMaterialInventory(
                result.materialInventory?.idno ?? "",
                slot,
                subSlot
            )

            this.deps.store.setCorrectState("true")
            this.deps.store.clearMaterialResult()

            await this.deps.store.success(
                `${MODE_NAME_TESTING}: 槽位 ${slotIdno} 綁定成功`
            )

            return true
        }

        const testRemark = bindingDecision.remark
        this.deps.store.clearMaterialResult()

        await this.deps.store.success(
            `${MODE_NAME_TESTING}: 槽位 ${slotIdno} 綁定成功 ${testRemark}`
        )

        this.deps.store.setCorrectState("warning")

        return true

    }
}
