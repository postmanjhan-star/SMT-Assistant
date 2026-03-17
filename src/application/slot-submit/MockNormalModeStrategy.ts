import { SlotSubmitContext } from "./SlotSubmitContext";
import { SlotSubmitStrategy } from "./SlotSubmitStrategy";
import { SlotSubmitDeps, type SlotSubmitBindingPort } from "./SlotSubmitDeps";
import { formatSlotIdno } from "@/domain/slot/SlotBindingRules";

const MODE_NAME_MOCK = '[Mock] 正式生產模式'

export class MockNormalModeStrategy implements SlotSubmitStrategy {
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
        const { result, slot, subSlot, slotIdno } = ctx

        if (!result) {
            store.setLastResult({ type: 'warn', message: '請先掃描物料條碼' })
            return false
        }

        const targetSlotId = formatSlotIdno({ slotIdno: slot, subSlotIdno: subSlot })
        const applied = binding.applyMatch(
            targetSlotId,
            result.materialInventory ?? null,
            { slot, subSlot }
        )

        if (!applied) {
            store.setLastResult({ type: 'error', message: `槽位不存在 ${slotIdno}` })
            return false
        }

        resetInputs()
        store.setLastResult({
            type: 'success',
            message: `${MODE_NAME_MOCK}：槽位 ${slotIdno} 綁定成功`,
        })
        return true
    }
}
