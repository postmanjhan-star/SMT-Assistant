export type SlotCandidate = {
    slotIdno: string
    subSlotIdno?: string | null
}

export type SlotBindingDecision =
    | { kind: 'no_allowed_slots' }
    | { kind: 'match'; matched: SlotCandidate; matchedSlotIdno: string }
    | {
        kind: 'mismatch'
        suggested: SlotCandidate
        suggestedSlotIdno: string
        inputSlotIdno: string
    }

export type TestingSlotBindingDecision =
    | { kind: 'match'; matched: SlotCandidate; matchedSlotIdno: string }
    | { kind: 'force_warning'; inputSlotIdno: string; remark: string }

export type AutoUploadRuleInput = {
    allCorrect: boolean
    isTestingMode: boolean
}

export const TESTING_FORCE_BIND_REMARK = '[廠商測試新料]'

const normalizeSlotIdno = (slotIdno?: string | number | null): string =>
    slotIdno == null ? '' : String(slotIdno)

const normalizeSubSlot = (subSlotIdno?: string | number | null): string =>
    subSlotIdno == null ? '' : String(subSlotIdno)

export const formatSlotIdno = (slot: SlotCandidate): string =>
    `${normalizeSlotIdno(slot.slotIdno)}-${normalizeSubSlot(slot.subSlotIdno)}`

export const isSameSlot = (a: SlotCandidate, b: SlotCandidate): boolean =>
    normalizeSlotIdno(a.slotIdno) === normalizeSlotIdno(b.slotIdno) &&
    normalizeSubSlot(a.subSlotIdno) === normalizeSubSlot(b.subSlotIdno)

export const decideSlotBinding = (
    inputSlot: SlotCandidate,
    allowedSlots: SlotCandidate[]
): SlotBindingDecision => {
    if (allowedSlots.length === 0) return { kind: 'no_allowed_slots' }

    const matched = allowedSlots.find(row => isSameSlot(row, inputSlot))
    if (matched) {
        return {
            kind: 'match',
            matched,
            matchedSlotIdno: formatSlotIdno(matched),
        }
    }

    const suggested = allowedSlots[0]
    return {
        kind: 'mismatch',
        suggested,
        suggestedSlotIdno: formatSlotIdno(suggested),
        inputSlotIdno: formatSlotIdno(inputSlot),
    }
}

export const decideTestingSlotBinding = (
    inputSlot: SlotCandidate,
    allowedSlots: SlotCandidate[],
    remark: string = TESTING_FORCE_BIND_REMARK
): TestingSlotBindingDecision => {
    const matched = allowedSlots.find(row => isSameSlot(row, inputSlot))
    if (matched) {
        return {
            kind: 'match',
            matched,
            matchedSlotIdno: formatSlotIdno(matched),
        }
    }

    return {
        kind: 'force_warning',
        inputSlotIdno: formatSlotIdno(inputSlot),
        remark,
    }
}

export const shouldAutoUpload = ({
    allCorrect,
    isTestingMode,
}: AutoUploadRuleInput): boolean => allCorrect && !isTestingMode
