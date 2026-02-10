export type SlotSubmitLastResult = {
    type: 'success' | 'warn' | 'error'
    message: string
}

export type SlotSubmitStoreLike = {
    setLastResult: (result: SlotSubmitLastResult | null) => void
    resetInputs: () => void
    hasRow: (rowId: string) => boolean
    applyMatch: (
        correctSlotIdno: string,
        materialInfo?: { idno?: string; remark?: string } | null,
        inputSlot?: string,
        inputSubSlot?: string | null
    ) => boolean
    applyWarningBinding: (
        slotIdno: string,
        materialInfo?: { idno?: string } | null,
        remark?: string
    ) => boolean
    applyMismatch: (
        inputSlot: { slot: string; subSlot: string | null },
        expectedSlotIdno: string,
        materialIdno?: string
    ) => void
}

export type SlotSubmitDeps = {
    store: SlotSubmitStoreLike
}
