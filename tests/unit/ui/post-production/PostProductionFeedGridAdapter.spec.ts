import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PostProductionFeedGridAdapter } from '@/ui/workflows/post-production/panasonic/PostProductionFeedGridAdapter'
import { RowModelBase } from '@/application/post-production-feed/PostProductionFeedTypes'

describe('PostProductionFeedGridAdapter', () => {
    const buildRow = (
        slotIdno: string,
        subSlotIdno?: string
    ): Pick<RowModelBase, 'slotIdno' | 'subSlotIdno'> => ({
        slotIdno,
        subSlotIdno,
    })

    const buildApi = (overrides: Partial<any> = {}) => ({
        getRowNode: vi.fn(),
        forEachNode: vi.fn(),
        applyTransaction: vi.fn(),
        ...overrides,
    })

    beforeEach(() => {
        vi.clearAllMocks()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('getRow returns matching row', () => {
        const rows = [
            buildRow('10008', 'L'),
            buildRow('10009', 'R'),
        ] as RowModelBase[]

        const api = buildApi()
        const adapter = new PostProductionFeedGridAdapter(() => api, () => rows)

        const row = adapter.getRow('10008', 'L')
        expect(row).toBe(rows[0])
    })

    it('getRowId formats slotId-subSlotId correctly', () => {
        const row = buildRow('10008', '') as RowModelBase
        const adapter = new PostProductionFeedGridAdapter(() => null, () => [])

        expect(adapter.getRowId(row)).toBe('10008-')
    })

    it('getRowId handles undefined subSlotIdno', () => {
        const row = buildRow('10008') as RowModelBase
        const adapter = new PostProductionFeedGridAdapter(() => null, () => [])

        expect(adapter.getRowId(row)).toBe('10008-')
    })

    it('getRowNode returns undefined when api is missing', () => {
        const adapter = new PostProductionFeedGridAdapter<RowModelBase>(
            () => null,
            () => []
        )

        expect(adapter.getRowNode('10008-L')).toBeUndefined()
    })

    it('deselectRow returns false when api is missing', () => {
        const adapter = new PostProductionFeedGridAdapter<RowModelBase>(
            () => null,
            () => []
        )

        expect(adapter.deselectRow('10008-L')).toBe(false)
    })

    it('deselectRow returns false when rowNode does not exist', () => {
        const api = buildApi({
            getRowNode: vi.fn().mockReturnValue(undefined),
        })
        const adapter = new PostProductionFeedGridAdapter(() => api, () => [])

        expect(adapter.deselectRow('10008-L')).toBe(false)
    })

    it('deselectRow deselects row when row exists', () => {
        const rowNode = { setSelected: vi.fn() }
        const api = buildApi({
            getRowNode: vi.fn().mockReturnValue(rowNode),
        })
        const adapter = new PostProductionFeedGridAdapter(() => api, () => [])

        const result = adapter.deselectRow('10008-L')

        expect(result).toBe(true)
        expect(rowNode.setSelected).toHaveBeenCalledWith(false)
    })

    it('cleanErrorMaterialInventory clears mismatched rows only', () => {
        const targetNode = {
            data: {
                materialInventoryIdno: 'MAT123',
                slotIdno: '10009',
                subSlotIdno: 'R',
                correct: 'false',
            },
            setDataValue: vi.fn(),
        }

        const sameSlotNode = {
            data: {
                materialInventoryIdno: 'MAT123',
                slotIdno: '10008',
                subSlotIdno: 'L',
                correct: 'false',
            },
            setDataValue: vi.fn(),
        }

        const correctNode = {
            data: {
                materialInventoryIdno: 'MAT123',
                slotIdno: '10010',
                subSlotIdno: 'L',
                correct: 'true',
            },
            setDataValue: vi.fn(),
        }

        const api = buildApi({
            forEachNode: vi.fn((cb: any) => {
                cb(targetNode)
                cb(sameSlotNode)
                cb(correctNode)
            }),
        })

        const adapter = new PostProductionFeedGridAdapter(() => api, () => [])

        adapter.cleanErrorMaterialInventory('MAT123', '10008', 'L')

        expect(targetNode.setDataValue).toHaveBeenCalledTimes(4)
        expect(targetNode.setDataValue).toHaveBeenCalledWith('materialInventoryIdno', '')
        expect(targetNode.setDataValue).toHaveBeenCalledWith('correct', '')
        expect(targetNode.setDataValue).toHaveBeenCalledWith('remark', '')
        expect(targetNode.setDataValue).toHaveBeenCalledWith('operationTime', null)

        expect(sameSlotNode.setDataValue).not.toHaveBeenCalled()
        expect(correctNode.setDataValue).not.toHaveBeenCalled()
    })

    it('applyInspectionUpdate updates inspection fields and applies transaction', () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2024-01-02T03:04:05.000Z'))

        const api = buildApi()
        const row: RowModelBase = {
            slotIdno: '10008',
            subSlotIdno: 'L',
        }

        const adapter = new PostProductionFeedGridAdapter(() => api, () => [row])

        adapter.applyInspectionUpdate(row, 'PACK-001')

        expect(row.inspectMaterialPackCode).toBe('PACK-001')
        expect(row.inspectTime).toBe('2024-01-02T03:04:05.000Z')
        expect(row.inspectCount).toBe(1)
        expect(row.remark).toBe('巡檢 1 次')
        expect(api.applyTransaction).toHaveBeenCalledWith({ update: [row] })

        // 累加行為
        adapter.applyInspectionUpdate(row, 'PACK-002')
        expect(row.inspectCount).toBe(2)
        expect(row.remark).toBe('巡檢 2 次')
    })

    it('setAppendedMaterialInventoryIdno returns false when api is missing', () => {
        const adapter = new PostProductionFeedGridAdapter<RowModelBase>(
            () => null,
            () => []
        )

        expect(
            adapter.setAppendedMaterialInventoryIdno('10008-L', 'APP-001')
        ).toBe(false)
    })

    it('setAppendedMaterialInventoryIdno updates row when row exists', () => {
        const rowNode = { setDataValue: vi.fn() }
        const api = buildApi({
            getRowNode: vi.fn().mockReturnValue(rowNode),
        })

        const adapter = new PostProductionFeedGridAdapter(() => api, () => [])

        const result = adapter.setAppendedMaterialInventoryIdno('10008-L', 'APP-001')

        expect(result).toBe(true)
        expect(rowNode.setDataValue).toHaveBeenCalledWith(
            'appendedMaterialInventoryIdno',
            'APP-001'
        )
    })
})
