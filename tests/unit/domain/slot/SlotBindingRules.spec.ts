import {
    decideSlotBinding,
    decideTestingSlotBinding,
    shouldAutoUpload,
    isSameSlot,
    formatSlotIdno,
    TESTING_FORCE_BIND_REMARK,
    SlotCandidate,
} from '@/domain/slot/SlotBindingRules'

describe('SlotBindingRules', () => {
    describe('formatSlotIdno', () => {
        it('formats slot with subSlot', () => {
            const slot: SlotCandidate = { slotIdno: 'A', subSlotIdno: '1' }
            expect(formatSlotIdno(slot)).toBe('A-1')
        })

        it('formats slot with null subSlot as empty', () => {
            const slot: SlotCandidate = { slotIdno: 'A', subSlotIdno: null }
            expect(formatSlotIdno(slot)).toBe('A-')
        })

        it('formats slot with undefined subSlot as empty', () => {
            const slot: SlotCandidate = { slotIdno: 'A' }
            expect(formatSlotIdno(slot)).toBe('A-')
        })
    })

    describe('isSameSlot', () => {
        it('returns true when slotIdno and subSlotIdno are the same', () => {
            const a: SlotCandidate = { slotIdno: 'A', subSlotIdno: '1' }
            const b: SlotCandidate = { slotIdno: 'A', subSlotIdno: '1' }

            expect(isSameSlot(a, b)).toBe(true)
        })

        it('treats null and undefined subSlot as equal', () => {
            const a: SlotCandidate = { slotIdno: 'A', subSlotIdno: null }
            const b: SlotCandidate = { slotIdno: 'A' }

            expect(isSameSlot(a, b)).toBe(true)
        })

        it('returns false when slotIdno differs', () => {
            const a: SlotCandidate = { slotIdno: 'A', subSlotIdno: '1' }
            const b: SlotCandidate = { slotIdno: 'B', subSlotIdno: '1' }

            expect(isSameSlot(a, b)).toBe(false)
        })

        it('returns false when subSlotIdno differs', () => {
            const a: SlotCandidate = { slotIdno: 'A', subSlotIdno: '1' }
            const b: SlotCandidate = { slotIdno: 'A', subSlotIdno: '2' }

            expect(isSameSlot(a, b)).toBe(false)
        })
    })

    describe('decideSlotBinding (Normal Mode)', () => {
        it('returns no_allowed_slots when allowedSlots is empty', () => {
            const result = decideSlotBinding(
                { slotIdno: 'A', subSlotIdno: '1' },
                []
            )

            expect(result).toEqual({ kind: 'no_allowed_slots' })
        })

        it('returns match when input slot matches allowed slot', () => {
            const allowedSlots: SlotCandidate[] = [
                { slotIdno: 'A', subSlotIdno: '1' },
                { slotIdno: 'B', subSlotIdno: '2' },
            ]

            const result = decideSlotBinding(
                { slotIdno: 'A', subSlotIdno: '1' },
                allowedSlots
            )

            expect(result.kind).toBe('match')

            if (result.kind === 'match') {
                expect(result.matchedSlotIdno).toBe('A-1')
            }
        })

        it('returns mismatch when input slot does not match any allowed slot', () => {
            const allowedSlots: SlotCandidate[] = [
                { slotIdno: 'A', subSlotIdno: '1' },
            ]

            const result = decideSlotBinding(
                { slotIdno: 'B', subSlotIdno: '2' },
                allowedSlots
            )

            expect(result.kind).toBe('mismatch')

            if (result.kind === 'mismatch') {
                expect(result.suggestedSlotIdno).toBe('A-1')
                expect(result.inputSlotIdno).toBe('B-2')
            }
        })
    })

    describe('decideTestingSlotBinding (Testing Mode)', () => {
        it('returns match when input slot matches allowed slot', () => {
            const allowedSlots: SlotCandidate[] = [
                { slotIdno: 'A', subSlotIdno: '1' },
            ]

            const result = decideTestingSlotBinding(
                { slotIdno: 'A', subSlotIdno: '1' },
                allowedSlots
            )

            expect(result.kind).toBe('match')

            if (result.kind === 'match') {
                expect(result.matchedSlotIdno).toBe('A-1')
            }
        })

        it('returns force_warning when input slot does not match allowed slots', () => {
            const allowedSlots: SlotCandidate[] = [
                { slotIdno: 'A', subSlotIdno: '1' },
            ]

            const result = decideTestingSlotBinding(
                { slotIdno: 'B', subSlotIdno: '2' },
                allowedSlots
            )

            expect(result.kind).toBe('force_warning')

            if (result.kind === 'force_warning') {
                expect(result.inputSlotIdno).toBe('B-2')
                expect(result.remark).toBe(TESTING_FORCE_BIND_REMARK)
            }
        })

        it('allows custom remark for force_warning', () => {
            const customRemark = '[自訂測試備註]'

            const result = decideTestingSlotBinding(
                { slotIdno: 'X', subSlotIdno: '9' },
                [],
                customRemark
            )

            expect(result.kind).toBe('force_warning')

            if (result.kind === 'force_warning') {
                expect(result.remark).toBe(customRemark)
            }
        })
    })

    describe('shouldAutoUpload', () => {
        it('returns true only when allCorrect and not in testing mode', () => {
            expect(
                shouldAutoUpload({ allCorrect: true, isTestingMode: false })
            ).toBe(true)
        })

        it('returns false when in testing mode even if allCorrect', () => {
            expect(
                shouldAutoUpload({ allCorrect: true, isTestingMode: true })
            ).toBe(false)
        })

        it('returns false when not allCorrect', () => {
            expect(
                shouldAutoUpload({ allCorrect: false, isTestingMode: false })
            ).toBe(false)
        })
    })
})
