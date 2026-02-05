import {
    appendMaterialCode,
    findLoadedSlotByPack,
    formatSlotId,
    isInspectionScan,
} from '@/domain/production/PostProductionFeedRules'

describe('PostProductionFeedRules', () => {
    describe('isInspectionScan', () => {
        it('returns false when production not started', () => {
            const result = isInspectionScan({
                productionStarted: false,
                stat: { slotIdno: 'A', subSlotIdno: '1', feedRecords: [] },
                importPackType: 'IMPORTED',
                inputPackIdno: 'PK1',
            })

            expect(result).toBe(false)
        })

        it('returns true when import pack matches input id', () => {
            const result = isInspectionScan({
                productionStarted: true,
                stat: {
                    slotIdno: 'A',
                    subSlotIdno: '1',
                    feedRecords: [
                        { feedMaterialPackType: 'IMPORTED', materialPackCode: 'PK1' },
                    ],
                },
                importPackType: 'IMPORTED',
                inputPackIdno: 'PK1',
            })

            expect(result).toBe(true)
        })

        it('returns false when import pack does not match input id', () => {
            const result = isInspectionScan({
                productionStarted: true,
                stat: {
                    slotIdno: 'A',
                    subSlotIdno: '1',
                    feedRecords: [
                        { feedMaterialPackType: 'IMPORTED', materialPackCode: 'PK1' },
                    ],
                },
                importPackType: 'IMPORTED',
                inputPackIdno: 'PK2',
            })

            expect(result).toBe(false)
        })
    })

    describe('findLoadedSlotByPack', () => {
        it('returns null when no stat contains the pack', () => {
            const result = findLoadedSlotByPack({
                stats: [
                    {
                        slotIdno: 'A',
                        subSlotIdno: '1',
                        feedRecords: [
                            { feedMaterialPackType: 'IMPORTED', materialPackCode: 'PK1' },
                        ],
                    },
                ],
                importPackType: 'IMPORTED',
                inputPackIdno: 'PK2',
            })

            expect(result).toBeNull()
        })

        it('returns slot info when pack found', () => {
            const result = findLoadedSlotByPack({
                stats: [
                    {
                        slotIdno: 'A',
                        subSlotIdno: '1',
                        feedRecords: [
                            { feedMaterialPackType: 'IMPORTED', materialPackCode: 'PK1' },
                        ],
                    },
                ],
                importPackType: 'IMPORTED',
                inputPackIdno: 'PK1',
            })

            expect(result).toEqual({ slotIdno: 'A', subSlotIdno: '1' })
        })
    })

    describe('appendMaterialCode', () => {
        it('appends to empty', () => {
            expect(appendMaterialCode('', 'PK1')).toBe('PK1')
        })

        it('keeps unique codes', () => {
            expect(appendMaterialCode('PK1', 'PK1')).toBe('PK1')
        })

        it('appends new code with comma and trim', () => {
            expect(appendMaterialCode('PK1, PK2', 'PK3')).toBe('PK1, PK2, PK3')
        })
    })

    describe('formatSlotId', () => {
        it('formats with subSlot', () => {
            expect(formatSlotId({ slotIdno: 'A', subSlotIdno: '1' })).toBe('A-1')
        })

        it('formats without subSlot as empty suffix', () => {
            expect(formatSlotId({ slotIdno: 'A' })).toBe('A-')
        })
    })
})
