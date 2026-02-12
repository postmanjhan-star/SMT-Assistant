import { SlotSubmitContext } from "./SlotSubmitContext";
import { SlotSubmitStrategy } from "./SlotSubmitStrategy";
import { SlotSubmitDeps, type SlotSubmitBindingPort } from "./SlotSubmitDeps";
import { decideSlotBinding } from "@/domain/slot/SlotBindingRules";

const MODE_NAME_NORMAL = '✅ 正式生產模式'

export class NormalModeStrategy implements SlotSubmitStrategy {
    constructor(private deps: SlotSubmitDeps) { }

    async submit(ctx: SlotSubmitContext): Promise<boolean> {
        const { store } = this.deps
        const fallbackBinding: SlotSubmitBindingPort = {
            applyMatch: () => false,
            applyMismatch: () => { },
            applyWarningBinding: () => false,
        }
        const storeBinding: SlotSubmitBindingPort | null =
            store.applyMatch
                ? {
                    applyMatch: store.applyMatch,
                    applyMismatch: store.applyMismatch ?? (() => { }),
                    applyWarningBinding:
                        store.applyWarningBinding ?? (() => false),
                }
                : null
        const binding: SlotSubmitBindingPort =
            this.deps.binding ?? storeBinding ?? fallbackBinding
        const resetInputs = this.deps.resetInputs ?? store.resetInputs ?? (() => { })
        const { result, slot, subSlot } = ctx

        if (!result) {
            store.setLastResult({ type: 'warn', message: '請先掃描物料條碼' })
            return false
        }

        const matchedRows = result.matchedRows || []
        const bindingDecision = decideSlotBinding(
            { slotIdno: slot, subSlotIdno: subSlot },
            matchedRows
        )

        if (bindingDecision.kind === 'no_allowed_slots') {
            store.setLastResult({ type: 'warn', message: '此物料未匹配任何槽位' })
            return false
        }

        if (bindingDecision.kind === 'match') {
            const correctSlotIdno = bindingDecision.matchedSlotIdno

            const applied = binding.applyMatch(
                correctSlotIdno,
                result.materialInventory ?? null,
                { slot, subSlot }
            )

            if (!applied) {
                store.setLastResult({
                    type: 'error',
                    message: `槽位不存在 ${correctSlotIdno}`,
                })
                return false
            }

            resetInputs()
            store.setLastResult({
                type: 'success',
                message: `${MODE_NAME_NORMAL}：槽位 ${correctSlotIdno} 綁定成功`,
            })
            return true
        } else {
            const suggestedSlot = bindingDecision.suggestedSlotIdno

            binding.applyMismatch(
                { slot, subSlot },
                suggestedSlot,
                result.materialInventory?.idno ?? ''
            )

            store.setLastResult({
                type: 'error',
                message: `錯誤的槽位 ${bindingDecision.inputSlotIdno}，此物料應放置於 ${suggestedSlot}`,
            })
            resetInputs()
            return false
        }
    }
}
