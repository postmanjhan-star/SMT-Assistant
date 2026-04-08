import { defineComponent, ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import {
  useUnloadReplaceFlow,
  type UseUnloadReplaceFlowOptions,
  type UnloadReplaceRowBase,
} from '@/ui/shared/composables/useUnloadReplaceFlow'

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────

function makeRow(overrides: Partial<UnloadReplaceRowBase> = {}): UnloadReplaceRowBase & Record<string, unknown> {
  return {
    id: 1,
    materialIdno: 'MAT-001',
    materialInventoryIdno: null,
    appendedMaterialInventoryIdno: null,
    spliceMaterialInventoryIdno: null,
    correct: null,
    ...overrides,
  }
}

function makeOptions(
  rows: UnloadReplaceRowBase[],
  overrides: Partial<UseUnloadReplaceFlowOptions<UnloadReplaceRowBase>> = {},
): UseUnloadReplaceFlowOptions<UnloadReplaceRowBase> {
  return {
    getGridApi: () => null,
    slotStrategy: {
      resolveSlot: (slotIdno) => {
        const row = rows.find((r) => String(r.id) === slotIdno)
        if (!row) return { ok: false, error: `找不到站位 ${slotIdno}` }
        return {
          ok: true,
          row,
          statId: row.id,
          uploadSlotIdno: slotIdno,
          uploadSubSlotIdno: null,
          displaySlotIdno: slotIdno,
          rowId: slotIdno,
        }
      },
      toDisplaySlotIdno: (row) => String(row.id),
      toRowId: (row) => String(row.id),
      getRowData: () => rows,
    },
    uploader: {
      uploadUnfeed: vi.fn().mockResolvedValue(undefined),
      uploadAppend: vi.fn().mockResolvedValue(undefined),
      fetchMaterialInventory: vi.fn().mockResolvedValue({ material_idno: 'MAT-001' }),
    },
    getOperatorId: () => null,
    ui: {
      success: vi.fn(),
      error: vi.fn(),
    },
    ...overrides,
  }
}

function setupComposable(
  rows: UnloadReplaceRowBase[],
  overrides: Partial<UseUnloadReplaceFlowOptions<UnloadReplaceRowBase>> = {},
) {
  const options = makeOptions(rows, overrides)
  let flow!: ReturnType<typeof useUnloadReplaceFlow>

  const wrapper = mount(defineComponent({
    setup() {
      flow = useUnloadReplaceFlow(options)
      return () => null
    },
  }))

  return { flow, options, wrapper }
}

// ────────────────────────────────────────────────────────────────
// Tests
// ────────────────────────────────────────────────────────────────

describe('useUnloadReplaceFlow — submitReplace', () => {
  describe('Bug 案例：卸除接料條碼後替換 → 應寫入 spliceMaterialInventoryIdno', () => {
    it('卸接料("B") → replace("C")：appended 保持 "A"，splice 變 "C"', async () => {
      const row = makeRow({
        appendedMaterialInventoryIdno: 'A',
        spliceMaterialInventoryIdno: 'B',
      })
      const { flow } = setupComposable([row])

      // 先卸除接料條碼 B
      const unloadOk = await flow.submitUnload({ materialPackCode: 'B', slotIdno: '1' })
      expect(unloadOk).toBe(true)
      expect(row.appendedMaterialInventoryIdno).toBe('A')
      expect(row.spliceMaterialInventoryIdno).toBe(null)

      // 換料：新捲號 C 應寫入 splice，appended 不動
      const replaceOk = await flow.submitReplace({ materialPackCode: 'C', slotIdno: '1' })
      expect(replaceOk).toBe(true)
      expect(row.appendedMaterialInventoryIdno).toBe('A')
      expect(row.spliceMaterialInventoryIdno).toBe('C')
    })
  })

  describe('接料晉升後 → 替換應寫 spliceMaterialInventoryIdno', () => {
    it('卸上料("A"，splice "B" 晉升) → replace("C")：appended="B"，splice="C"', async () => {
      const row = makeRow({
        appendedMaterialInventoryIdno: 'A',
        spliceMaterialInventoryIdno: 'B',
      })
      const { flow } = setupComposable([row])

      // 卸除上料 A，接料 B 晉升為 appended
      const unloadOk = await flow.submitUnload({ materialPackCode: 'A', slotIdno: '1' })
      expect(unloadOk).toBe(true)
      expect(row.appendedMaterialInventoryIdno).toBe('B')
      expect(row.spliceMaterialInventoryIdno).toBe(null)

      // 換料：新捲號 C 應寫入 splice，appended 保持 "B"
      const replaceOk = await flow.submitReplace({ materialPackCode: 'C', slotIdno: '1' })
      expect(replaceOk).toBe(true)
      expect(row.appendedMaterialInventoryIdno).toBe('B')
      expect(row.spliceMaterialInventoryIdno).toBe('C')
    })
  })

  describe('正常換料（無接料）→ 替換應寫 appendedMaterialInventoryIdno', () => {
    it('卸上料("A"，無 splice) → replace("C")：appended="C"，splice=null', async () => {
      const row = makeRow({
        appendedMaterialInventoryIdno: 'A',
        spliceMaterialInventoryIdno: null,
      })
      const { flow } = setupComposable([row])

      // 卸除上料 A，無接料
      const unloadOk = await flow.submitUnload({ materialPackCode: 'A', slotIdno: '1' })
      expect(unloadOk).toBe(true)
      expect(row.appendedMaterialInventoryIdno).toBe('')
      expect(row.spliceMaterialInventoryIdno).toBe(null)

      // 換料：新捲號 C 應寫入 appended
      const replaceOk = await flow.submitReplace({ materialPackCode: 'C', slotIdno: '1' })
      expect(replaceOk).toBe(true)
      expect(row.appendedMaterialInventoryIdno).toBe('C')
      expect(row.spliceMaterialInventoryIdno).toBe(null)
    })
  })
})
