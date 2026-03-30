import { defineComponent, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { useMounterOperationFlowsCore } from '@/ui/shared/composables/core/useMounterOperationFlowsCore'
import type {
  MounterOperationFlowsAdapter,
  MounterOperationFlowsCoreOptions,
} from '@/ui/shared/composables/core/MounterOperationFlowsAdapter'
import type { IpqcInspectionRecord } from '@/domain/mounter/ipqcTypes'

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────

function makeRow(overrides: Record<string, unknown> = {}): any {
  return {
    id: 1,
    slotIdno: '1',
    subSlotIdno: '',
    materialIdno: 'MAT-001',
    materialInventoryIdno: 'BARCODE-001',
    appendedMaterialInventoryIdno: '',
    correct: 'MATCHED_MATERIAL_PACK',
    inspectCount: 0,
    inspectorIdno: null,
    ...overrides,
  }
}

function makeAdapter(overrides: Partial<MounterOperationFlowsAdapter> = {}): MounterOperationFlowsAdapter {
  return {
    toRowKey: (row) => String(row.slotIdno),
    toRowSlotIdno: (row) => String(row.slotIdno),
    applyGridTransaction: vi.fn(),
    setColumnVisible: vi.fn(),
    findRowBySlotInput: (_slotIdno, rowData) => rowData[0] ?? null,
    slotsMatch: (input, target) => input === target,
    buildUnloadRecord: vi.fn().mockReturnValue({}),
    buildSpliceRecord: vi.fn().mockReturnValue({}),
    buildIpqcRecord: (_row, params) => ({
      slotIdno: params.slotIdno,
      subSlotIdno: null,
      materialPackCode: params.materialPackCode,
      inspectorIdno: params.inspectorIdno,
      inspectionTime: params.inspectionTime,
    } as IpqcInspectionRecord),
    ...overrides,
  }
}

function makeOptions(
  overrides: Partial<MounterOperationFlowsCoreOptions> = {},
): MounterOperationFlowsCoreOptions {
  return {
    rowData: ref([]),
    currentUsername: { value: 'INSPECTOR-01' } as any,
    isTestingMode: ref(false),
    isMockMode: true,
    fetchMaterialInventory: vi.fn().mockResolvedValue({ idno: 'BARCODE-002', materialIdno: 'MAT-002' }),
    showError: vi.fn(),
    handleUserSwitchTrigger: vi.fn().mockReturnValue(false),
    clearNormalScanState: vi.fn(),
    focusMaterialInput: vi.fn(),
    persistNow: vi.fn(),
    pendingUnloadRecords: ref([]),
    pendingSpliceRecords: ref([]),
    pendingIpqcRecords: ref([]),
    ...overrides,
  }
}

function setupCore(
  optionsOverrides: Partial<MounterOperationFlowsCoreOptions> = {},
  adapterOverrides: Partial<MounterOperationFlowsAdapter> = {},
) {
  const opts = makeOptions(optionsOverrides)
  const adapter = makeAdapter(adapterOverrides)
  let core!: ReturnType<typeof useMounterOperationFlowsCore>

  mount(defineComponent({
    setup() {
      core = useMounterOperationFlowsCore(opts, adapter)
      return () => null
    },
  }))

  return { core, opts, adapter }
}

// ──────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────

describe('useMounterOperationFlowsCore', () => {

  describe('一般模式重複掃描偵測', () => {
    it('條碼已存在於 materialInventoryIdno → showError，回傳 false', async () => {
      const row = makeRow({ materialInventoryIdno: 'BARCODE-001' })
      const { core, opts } = setupCore({ rowData: ref([row]) })
      const result = await core.handleBeforeMaterialScan('BARCODE-001')
      expect(result).toBe(false)
      expect(opts.showError).toHaveBeenCalledWith(expect.stringContaining('重複掃描'))
    })

    it('條碼已存在於 appendedMaterialInventoryIdno → showError，回傳 false', async () => {
      const row = makeRow({ appendedMaterialInventoryIdno: 'BARCODE-X,BARCODE-Y' })
      const { core, opts } = setupCore({ rowData: ref([row]) })
      const result = await core.handleBeforeMaterialScan('BARCODE-Y')
      expect(result).toBe(false)
      expect(opts.showError).toHaveBeenCalledWith(expect.stringContaining('重複掃描'))
    })

    it('條碼不在格線中 → 允許掃描，回傳 true', async () => {
      const row = makeRow({ materialInventoryIdno: 'BARCODE-001' })
      const { core, opts } = setupCore({ rowData: ref([row]) })
      const result = await core.handleBeforeMaterialScan('BARCODE-999')
      expect(result).toBe(true)
      expect(opts.showError).not.toHaveBeenCalled()
    })

    it('IPQC 模式中不封鎖相同條碼（duplicate 偵測不觸發）', async () => {
      const row = makeRow({ materialInventoryIdno: 'BARCODE-001' })
      const { core, opts } = setupCore({ rowData: ref([row]) })

      // Enter IPQC mode via trigger code
      await core.handleBeforeMaterialScan('S5588')
      expect(core.isIpqcMode.value).toBe(true)

      // In IPQC mode, handleBeforeMaterialScan allows the scan (returns true)
      // and does NOT trigger duplicate detection
      const result = await core.handleBeforeMaterialScan('BARCODE-001')
      expect(result).toBe(true)
      expect(opts.showError).not.toHaveBeenCalledWith(expect.stringContaining('重複掃描'))
    })
  })

  describe('IPQC 模式 — 覆檢成功', () => {
    it('料號一致 → 設定 correct=✅，記錄 inspectorIdno', async () => {
      const row = makeRow({
        materialInventoryIdno: 'BARCODE-001',
        appendedMaterialInventoryIdno: '',
      })
      const findRowBySlotInput = vi.fn().mockReturnValue(row)
      const { core, opts } = setupCore(
        { rowData: ref([row]) },
        { findRowBySlotInput },
      )

      // Enter IPQC mode
      await core.handleBeforeMaterialScan('S5588')
      expect(core.isIpqcMode.value).toBe(true)

      core.ipqcMaterialValue.value = 'BARCODE-001'
      core.ipqcSlotValue.value = '1'
      await core.handleIpqcSlotSubmit()

      expect(row.correct).toBe('MATCHED_MATERIAL_PACK')
      expect(row.inspectorIdno).toBe('INSPECTOR-01')
      expect(row.inspectCount).toBe(1)
    })

    it('成功覆檢可重複掃描同一條碼（不同站位）', async () => {
      const row1 = makeRow({ id: 1, slotIdno: '1', materialInventoryIdno: 'BARCODE-001' })
      const row2 = makeRow({ id: 2, slotIdno: '2', materialInventoryIdno: 'BARCODE-001' })
      let callCount = 0
      const findRowBySlotInput = vi.fn().mockImplementation(() => {
        return callCount++ === 0 ? row1 : row2
      })

      const { core } = setupCore(
        { rowData: ref([row1, row2]) },
        { findRowBySlotInput },
      )

      await core.handleBeforeMaterialScan('S5588')

      // First slot
      core.ipqcMaterialValue.value = 'BARCODE-001'
      core.ipqcSlotValue.value = '1'
      await core.handleIpqcSlotSubmit()
      expect(row1.correct).toBe('MATCHED_MATERIAL_PACK')

      // Same barcode, second slot - should also succeed
      core.ipqcMaterialValue.value = 'BARCODE-001'
      core.ipqcSlotValue.value = '2'
      await core.handleIpqcSlotSubmit()
      expect(row2.correct).toBe('MATCHED_MATERIAL_PACK')
    })
  })

  describe('IPQC 模式 — 料號不符警示', () => {
    it('掃描條碼與站位當前條碼不符 → showError（警示）', async () => {
      const row = makeRow({
        materialInventoryIdno: 'BARCODE-CORRECT',
        appendedMaterialInventoryIdno: '',
      })
      const findRowBySlotInput = vi.fn().mockReturnValue(row)
      const { core, opts } = setupCore(
        { rowData: ref([row]) },
        { findRowBySlotInput },
      )

      await core.handleBeforeMaterialScan('S5588')

      core.ipqcMaterialValue.value = 'BARCODE-WRONG'
      core.ipqcSlotValue.value = '1'
      await core.handleIpqcSlotSubmit()

      expect(opts.showError).toHaveBeenCalledWith(expect.stringContaining('料號不符'))
      expect(row.correct).not.toBe('MATCHED_MATERIAL_PACK')
    })
  })

  describe('IPQC 欄位顯示切換', () => {
    it('進入 IPQC 模式時呼叫 setColumnVisible 顯示 IPQC 欄位', async () => {
      const setColumnVisible = vi.fn()
      const toggleNormalColumnsForIpqc = vi.fn()
      const { core } = setupCore(
        { rowData: ref([makeRow()]) },
        { setColumnVisible, toggleNormalColumnsForIpqc },
      )

      await core.handleBeforeMaterialScan('S5588')

      expect(setColumnVisible).toHaveBeenCalledWith('inspectMaterialPackCode', true)
      expect(setColumnVisible).toHaveBeenCalledWith('inspectTime', true)
      expect(setColumnVisible).toHaveBeenCalledWith('inspectorIdno', true)
      expect(toggleNormalColumnsForIpqc).toHaveBeenCalledWith(true)
    })

    it('退出 IPQC 模式時呼叫 setColumnVisible 隱藏 IPQC 欄位', async () => {
      const setColumnVisible = vi.fn()
      const toggleNormalColumnsForIpqc = vi.fn()
      const { core } = setupCore(
        { rowData: ref([makeRow()]) },
        { setColumnVisible, toggleNormalColumnsForIpqc },
      )

      // Enter then exit
      await core.handleBeforeMaterialScan('S5588')
      setColumnVisible.mockClear()
      toggleNormalColumnsForIpqc.mockClear()

      await core.handleBeforeMaterialScan('S5588') // toggle off

      expect(setColumnVisible).toHaveBeenCalledWith('inspectMaterialPackCode', false)
      expect(setColumnVisible).toHaveBeenCalledWith('inspectTime', false)
      expect(setColumnVisible).toHaveBeenCalledWith('inspectorIdno', false)
      expect(toggleNormalColumnsForIpqc).toHaveBeenCalledWith(false)
    })
  })
})
