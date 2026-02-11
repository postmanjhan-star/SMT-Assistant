import { SlotSubmitContext } from "./SlotSubmitContext";
import { SlotSubmitStrategy } from "./SlotSubmitStrategy";
import { SlotSubmitDeps } from "./SlotSubmitDeps";
import { decideSlotBinding, formatSlotIdno, TESTING_FORCE_BIND_REMARK } from "@/domain/slot/SlotBindingRules";

const MODE_NAME_TESTING = '🧪 試產生產模式'

export class TestingModeStrategy implements SlotSubmitStrategy {
    constructor(private deps: SlotSubmitDeps) {}

    async submit(ctx: SlotSubmitContext): Promise<boolean> {
        const { store } = this.deps
        const { result, slot, subSlot, slotIdno } = ctx

        if (!result) {
            store.setLastResult({ type: 'warn', message: '錯誤的槽位' })
            return false
        }

        const matchedRows = result.matchedRows || []
        const inputSlotIdno = formatSlotIdno({ slotIdno: slot, subSlotIdno: subSlot })

        if (!store.hasRow(inputSlotIdno)) {
            store.setLastResult({ type: 'error', message: `不存在槽位 ${slotIdno}` })
            return false
        }

        if (matchedRows.length > 0) {
            const bindingDecision = decideSlotBinding(
                { slotIdno: slot, subSlotIdno: subSlot },
                matchedRows
            )

            if (bindingDecision.kind === 'match') {
                if (!store.hasRow(bindingDecision.matchedSlotIdno)) {
                    store.setLastResult({ type: 'error', message: `槽位錯誤 ${slotIdno}` })
                    return false
                }

                const applied = store.applyMatch(
                    bindingDecision.matchedSlotIdno,
                    result.materialInventory ?? null,
                    slot,
                    subSlot
                )

                if (!applied) {
                    store.setLastResult({ type: 'error', message: `槽位錯誤 ${slotIdno}` })
                    return false
                }

                store.resetInputs()
                store.setLastResult({
                    type: 'success',
                    message: `${MODE_NAME_TESTING}: 槽位 ${slotIdno} 綁定成功`,
                })
                return true
            }

            const suggestedSlot =
                bindingDecision.kind === 'mismatch'
                    ? bindingDecision.suggestedSlotIdno
                    : `${slot}-${subSlot}`

            store.applyMismatch(
                { slot, subSlot },
                suggestedSlot,
                result.materialInventory?.idno ?? ''
            )

            store.setLastResult({
                type: 'error',
                message: `錯誤的槽位 ${slotIdno} ，此物料應放置於 ${suggestedSlot}`,
            })
            store.resetInputs()
            return false
        }

        // 
        const testRemark = TESTING_FORCE_BIND_REMARK
        const updated = store.applyWarningBinding(
            inputSlotIdno,
            result.materialInventory ?? null,
            testRemark
        )

        if (!updated) {
            store.setLastResult({ type: 'error', message: `槽位不存在 ${slotIdno}` })
            return false
        }

        store.setLastResult({
            type: 'success',
            message: `${MODE_NAME_TESTING}: 槽位 ${slotIdno} 綁定成功 ${testRemark}`,
        })
        store.resetInputs()
        return true
    }
}
