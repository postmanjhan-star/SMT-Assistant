import { describe, it, expect } from 'vitest'
import { createPanasonicProductionGrid } from '@/ui/workflows/post-production/panasonic/PanasonicProductionGridAdapter'
import { createFujiProductionGridOptions } from '@/ui/workflows/post-production/fuji/createFujiProductionGridOptions'

describe('Panasonic getRowId / getBusinessKeyForNode', () => {
  const grid = createPanasonicProductionGrid()

  it('normalises null subSlotIdno to empty string', () => {
    const id = grid.getRowId!({ data: { slotIdno: '001', subSlotIdno: null } } as any)
    expect(id).toBe('001-')
  })

  it('preserves non-null subSlotIdno', () => {
    const id = grid.getRowId!({ data: { slotIdno: '001', subSlotIdno: 'L' } } as any)
    expect(id).toBe('001-L')
  })

  it('getBusinessKeyForNode normalises null subSlotIdno', () => {
    const key = grid.getBusinessKeyForNode!({ data: { slotIdno: '001', subSlotIdno: null } } as any)
    expect(key).toBe('001-')
  })
})

describe('Fuji getRowId', () => {
  const grid = createFujiProductionGridOptions()

  it('normalises null subSlotIdno to empty string', () => {
    const id = grid.getRowId!({ data: { slotIdno: '25', subSlotIdno: null } } as any)
    expect(id).toBe('25-')
  })

  it('preserves non-null subSlotIdno', () => {
    const id = grid.getRowId!({ data: { slotIdno: '25', subSlotIdno: 'A' } } as any)
    expect(id).toBe('25-A')
  })
})
