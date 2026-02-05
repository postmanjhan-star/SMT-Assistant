import { SlotSubmitContext } from "./SlotSubmitContext";
import { SlotSubmitStrategy } from "./SlotSubmitStrategy";
import { SlotSubmitDeps } from "./SlotSubmitDeps";
import { decideSlotBinding, formatSlotIdno, TESTING_FORCE_BIND_REMARK } from "@/domain/slot/SlotBindingRules";

const MODE_NAME_TESTING = '🧪 試產生產模式'

export class TestingModeStrategy implements SlotSubmitStrategy {
    constructor(private deps: SlotSubmitDeps) {}

    async submit(ctx: SlotSubmitContext): Promise<boolean> {
        const { grid, ui, resetInputs } = this.deps
        const { result, slot, subSlot, slotIdno } = ctx

        if (!result) { await ui.warn('錯誤的槽位'); return false; }

        const matchedRows = result.matchedRows || []
        const inputSlotIdno = formatSlotIdno({ slotIdno: slot, subSlotIdno: subSlot })

        if (!grid.hasRow(inputSlotIdno)) { await ui.error(`不存在槽位 ${slotIdno}`); return false; }

        if (matchedRows.length > 0) {
            const bindingDecision = decideSlotBinding(
                { slotIdno: slot, subSlotIdno: subSlot },
                matchedRows
            )

            if (bindingDecision.kind === 'match') {
                if (!grid.hasRow(bindingDecision.matchedSlotIdno)) {
                    await ui.error(`槽位錯誤 ${slotIdno}`)
                    return false
                }

                grid.cleanErrorMaterialInventory(result.materialInventory?.idno, slot, subSlot)

                grid.applyBindingSuccess(
                    bindingDecision.matchedSlotIdno,
                    result.materialInventory?.idno ?? '',
                    result.materialInventory?.remark ?? ''
                )

                resetInputs()
                await ui.success(`${MODE_NAME_TESTING}??? ${slotIdno} ????`)
                return true
            }

            const suggestedSlot =
                bindingDecision.kind === 'mismatch'
                    ? bindingDecision.suggestedSlotIdno
                    : `${slot}-${subSlot}`

            grid.markMismatch(slot, subSlot, result.materialInventory?.idno ?? '')
            grid.deselectRow(suggestedSlot)

            await ui.error(`錯誤的槽位 ${slotIdno} ，此物料應放置於 ${suggestedSlot}`)
            resetInputs()
            return false
        }

        // 
        const testRemark = TESTING_FORCE_BIND_REMARK
        const updated = grid.applyWarningBinding(
            inputSlotIdno,
            result.materialInventory?.idno ?? '',
            testRemark
        )

        if (!updated) { await ui.error(`槽位不存在 ${slotIdno}`); return false; }

        await ui.success(`${MODE_NAME_TESTING}: 槽位 ${slotIdno} 綁定成功 ${testRemark}`)
        resetInputs()
        return true
    }
}
