import { SlotInputPolicy } from "@/domain/preproduction/SlotInputPolicy"
import type { SlotInputReset } from "@/domain/preproduction/SlotInputPolicy"

export type SubmitSlotPayload = {
    slotIdno: string
    slot: string
    subSlot: string
}

export type SubmitSlotResult = {
    success: boolean
    reset?: SlotInputReset
}

export type SubmitSlotUseCaseDeps = {
    submitSlot: (payload: SubmitSlotPayload) => Promise<boolean>
}

export class SubmitSlotUseCase {
    constructor(private deps: SubmitSlotUseCaseDeps) {}

    async execute(payload: SubmitSlotPayload): Promise<SubmitSlotResult> {
        const success = await this.deps.submitSlot(payload)
        if (!success) return { success: false }
        return {
            success: true,
            reset: SlotInputPolicy.clearAfterSuccessfulBinding(),
        }
    }
}
