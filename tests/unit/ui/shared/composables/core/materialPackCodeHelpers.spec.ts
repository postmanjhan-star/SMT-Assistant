import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import {
  CORRECT_STATE,
  createMaterialPackCodeHelpers,
} from '@/ui/shared/composables/core/flows/materialPackCodeHelpers'

function makeRow(overrides: Record<string, unknown> = {}): any {
  return {
    slotIdno: '1',
    materialInventoryIdno: 'LOADED-001',
    appendedMaterialInventoryIdno: '',
    spliceMaterialInventoryIdno: '',
    correct: CORRECT_STATE.MATCHED,
    ...overrides,
  }
}

function makeHelpers(rows: any[], isIpqcMode = false) {
  return createMaterialPackCodeHelpers({
    isIpqcMode: ref(isIpqcMode),
    rowData: ref(rows),
    toRowSlotIdno: (row) => String(row.slotIdno),
  })
}

describe('createMaterialPackCodeHelpers', () => {
  describe('getLoadedPackCode', () => {
    it('回傳 appendedMaterialInventoryIdno 優先', () => {
      const helpers = makeHelpers([])
      const row = makeRow({ appendedMaterialInventoryIdno: 'APPEND-001' })
      expect(helpers.getLoadedPackCode(row)).toBe('APPEND-001')
    })

    it('UNLOADED 且非 IPQC 模式時回傳空字串', () => {
      const helpers = makeHelpers([], false)
      const row = makeRow({ correct: CORRECT_STATE.UNLOADED })
      expect(helpers.getLoadedPackCode(row)).toBe('')
    })

    it('UNLOADED 但在 IPQC 模式下仍回傳原 materialInventoryIdno', () => {
      const helpers = makeHelpers([], true)
      const row = makeRow({ correct: CORRECT_STATE.UNLOADED })
      expect(helpers.getLoadedPackCode(row)).toBe('LOADED-001')
    })

    it('預設回傳 materialInventoryIdno', () => {
      const helpers = makeHelpers([])
      expect(helpers.getLoadedPackCode(makeRow())).toBe('LOADED-001')
    })
  })

  describe('getSplicePackCode', () => {
    it('回傳 spliceMaterialInventoryIdno', () => {
      const helpers = makeHelpers([])
      const row = makeRow({ spliceMaterialInventoryIdno: 'SPLICE-001' })
      expect(helpers.getSplicePackCode(row)).toBe('SPLICE-001')
    })

    it('無接料條碼時回傳空字串', () => {
      expect(makeHelpers([]).getSplicePackCode(makeRow())).toBe('')
    })
  })

  describe('getCurrentPackCode', () => {
    it('有接料條碼時優先回傳 splice', () => {
      const helpers = makeHelpers([])
      const row = makeRow({ spliceMaterialInventoryIdno: 'SPLICE-001' })
      expect(helpers.getCurrentPackCode(row)).toBe('SPLICE-001')
    })

    it('無接料條碼時 fallback 到 loaded', () => {
      const helpers = makeHelpers([])
      expect(helpers.getCurrentPackCode(makeRow())).toBe('LOADED-001')
    })
  })

  describe('getForceUnloadPackCode', () => {
    it('即使 correct=UNLOADED 仍可回傳原 materialInventoryIdno', () => {
      const helpers = makeHelpers([], false)
      const row = makeRow({ correct: CORRECT_STATE.UNLOADED })
      expect(helpers.getForceUnloadPackCode(row)).toBe('LOADED-001')
    })

    it('三個欄位都空時回傳 null', () => {
      const helpers = makeHelpers([])
      const row = makeRow({
        materialInventoryIdno: '',
        appendedMaterialInventoryIdno: '',
        spliceMaterialInventoryIdno: '',
      })
      expect(helpers.getForceUnloadPackCode(row)).toBeNull()
    })
  })

  describe('rowMatchesPackCode', () => {
    it('比對 loaded pack code', () => {
      const helpers = makeHelpers([])
      expect(helpers.rowMatchesPackCode(makeRow(), 'LOADED-001')).toBe(true)
    })

    it('比對 splice pack code', () => {
      const helpers = makeHelpers([])
      const row = makeRow({ spliceMaterialInventoryIdno: 'SPLICE-001' })
      expect(helpers.rowMatchesPackCode(row, 'SPLICE-001')).toBe(true)
    })

    it('兩者都不符時回傳 false', () => {
      const helpers = makeHelpers([])
      expect(helpers.rowMatchesPackCode(makeRow(), 'OTHER')).toBe(false)
    })
  })

  describe('isBarcodeAlreadyInGrid', () => {
    it('掃到已上料條碼時回傳 true', () => {
      const rows = [makeRow({ materialInventoryIdno: 'BARCODE-A' })]
      expect(makeHelpers(rows).isBarcodeAlreadyInGrid('BARCODE-A')).toBe(true)
    })

    it('掃到已接料條碼時回傳 true', () => {
      const rows = [makeRow({ spliceMaterialInventoryIdno: 'SPLICE-A' })]
      expect(makeHelpers(rows).isBarcodeAlreadyInGrid('SPLICE-A')).toBe(true)
    })

    it('不在 grid 時回傳 false', () => {
      const rows = [makeRow({ materialInventoryIdno: 'BARCODE-A' })]
      expect(makeHelpers(rows).isBarcodeAlreadyInGrid('OTHER')).toBe(false)
    })
  })

  describe('findUniqueUnloadSlotByPackCode', () => {
    it('找到單一站位時回傳 ok=true + row + slotIdno', () => {
      const rows = [
        makeRow({ slotIdno: '1', materialInventoryIdno: 'A' }),
        makeRow({ slotIdno: '2', materialInventoryIdno: 'B' }),
      ]
      const result = makeHelpers(rows).findUniqueUnloadSlotByPackCode('A')
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.slotIdno).toBe('1')
        expect(result.row.materialInventoryIdno).toBe('A')
      }
    })

    it('空輸入時回傳錯誤', () => {
      const result = makeHelpers([]).findUniqueUnloadSlotByPackCode('   ')
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error).toContain('請先輸入物料條碼')
    })

    it('找不到時回傳錯誤', () => {
      const rows = [makeRow({ materialInventoryIdno: 'A' })]
      const result = makeHelpers(rows).findUniqueUnloadSlotByPackCode('B')
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error).toContain('找不到料號 B')
    })

    it('多站位符合時回傳錯誤並列出站位', () => {
      const rows = [
        makeRow({ slotIdno: '1', materialInventoryIdno: 'DUP' }),
        makeRow({ slotIdno: '2', materialInventoryIdno: 'DUP' }),
      ]
      const result = makeHelpers(rows).findUniqueUnloadSlotByPackCode('DUP')
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toContain('多個站位')
        expect(result.error).toContain('1')
        expect(result.error).toContain('2')
      }
    })
  })
})
