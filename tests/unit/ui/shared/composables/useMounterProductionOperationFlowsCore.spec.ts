import { computed, defineComponent, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { useMounterProductionOperationFlowsCore } from '@/ui/shared/composables/core/useMounterProductionOperationFlowsCore'
import type {
  MounterProductionFlowsCoreOptions,
} from '@/ui/shared/composables/core/useMounterProductionOperationFlowsCore'
import type { MounterProductionOperationFlowsAdapter } from '@/ui/shared/composables/core/MounterProductionOperationFlowsAdapter'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeRow(overrides: Record<string, unknown> = {}): any {
  return {
    id: 1,
    slotIdno: '1',
    subSlotIdno: '',
    materialIdno: 'MAT-001',
    materialInventoryIdno: 'BARCODE-001',
    appendedMaterialInventoryIdno: '',
    spliceMaterialInventoryIdno: '',
    correct: 'MATCHED_MATERIAL_PACK',
    inspectCount: 0,
    inspectorIdno: null,
    ...overrides,
  }
}

function makeAdapter(overrides: Partial<MounterProductionOperationFlowsAdapter> = {}): MounterProductionOperationFlowsAdapter {
  return {
    toRowKey: (row) => String(row.slotIdno),
    toRowSlotIdno: (row) => String(row.slotIdno),
    applyGridTransaction: vi.fn(),
    setColumnVisible: vi.fn(),
    findRowBySlotInput: (_slotIdno, rowData) => rowData[0] ?? null,
    slotsMatch: (input, target) => input.trim() === target.trim(),
    submitIpqcRow: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function makeOptions(
  overrides: Partial<MounterProductionFlowsCoreOptions> = {},
): MounterProductionFlowsCoreOptions {
  return {
    rowData: ref([]),
    currentUsername: computed(() => 'INSPECTOR-01'),
    isTestingMode: ref(false),
    isMockMode: true,
    showError: vi.fn(),
    showSuccess: vi.fn(),
    handleUserSwitchTrigger: vi.fn().mockReturnValue(false),
    clearNormalScanState: vi.fn(),
    focusMaterialInput: vi.fn(),
    submitUnload: vi.fn().mockResolvedValue(true),
    submitForceUnloadBySlot: vi.fn().mockResolvedValue({ ok: true, slotIdno: '1' }),
    findUniqueUnloadSlotByPackCode: vi.fn().mockReturnValue({ ok: true, slotIdno: '1' }),
    validateUnloadMaterialPackCode: vi.fn().mockResolvedValue(true),
    validateReplacementMaterialForSlot: vi.fn().mockResolvedValue(true),
    submitReplace: vi.fn().mockResolvedValue(true),
    submitSplice: vi.fn().mockResolvedValue(true),
    ...overrides,
  }
}

function setupCore(
  optionsOverrides: Partial<MounterProductionFlowsCoreOptions> = {},
  adapterOverrides: Partial<MounterProductionOperationFlowsAdapter> = {},
) {
  const opts = makeOptions(optionsOverrides)
  const adapter = makeAdapter(adapterOverrides)
  let core!: ReturnType<typeof useMounterProductionOperationFlowsCore>

  mount(defineComponent({
    setup() {
      core = useMounterProductionOperationFlowsCore(opts, adapter)
      return () => null
    },
  }))

  return { core, opts, adapter }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('useMounterProductionOperationFlowsCore', () => {

  describe('一般模式重複掃描偵測', () => {
    it('條碼已存在於 materialInventoryIdno → showError，回傳 false', async () => {
      const row = makeRow({ materialInventoryIdno: 'BARCODE-001' })
      const { core, opts } = setupCore({ rowData: ref([row]) })
      const result = core.handleBeforeMaterialScan('BARCODE-001')
      expect(result).toBe(false)
      expect(opts.showError).toHaveBeenCalledWith(expect.stringContaining('重複掃描'))
    })

    it('條碼已存在於 appendedMaterialInventoryIdno → showError，回傳 false', async () => {
      const row = makeRow({ appendedMaterialInventoryIdno: 'BARCODE-Y' })
      const { core, opts } = setupCore({ rowData: ref([row]) })
      const result = core.handleBeforeMaterialScan('BARCODE-Y')
      expect(result).toBe(false)
      expect(opts.showError).toHaveBeenCalledWith(expect.stringContaining('重複掃描'))
    })

    it('條碼已存在於 spliceMaterialInventoryIdno → showError，回傳 false', async () => {
      const row = makeRow({ spliceMaterialInventoryIdno: 'BARCODE-S' })
      const { core, opts } = setupCore({ rowData: ref([row]) })
      const result = core.handleBeforeMaterialScan('BARCODE-S')
      expect(result).toBe(false)
      expect(opts.showError).toHaveBeenCalledWith(expect.stringContaining('重複掃描'))
    })

    it('條碼不在格線中 → 允許掃描，回傳 true', async () => {
      const row = makeRow({ materialInventoryIdno: 'BARCODE-001' })
      const { core, opts } = setupCore({ rowData: ref([row]) })
      const result = core.handleBeforeMaterialScan('BARCODE-999')
      expect(result).toBe(true)
      expect(opts.showError).not.toHaveBeenCalled()
    })

    it('IPQC 模式中不封鎖相同條碼', async () => {
      const row = makeRow({ materialInventoryIdno: 'BARCODE-001' })
      const { core } = setupCore({ rowData: ref([row]) })
      // enter IPQC mode via trigger
      core.handleBeforeMaterialScan('S5588')
      expect(core.isIpqcMode.value).toBe(true)
      // duplicate should be allowed in IPQC mode
      const result = core.handleBeforeMaterialScan('BARCODE-001')
      expect(result).toBe(true)
    })
  })

  describe('站位提交前置守衛 — handleBeforeSlotSubmit', () => {
    it('站位已有 appendedMaterialInventoryIdno → showError，回傳 false', () => {
      const row = makeRow({ appendedMaterialInventoryIdno: 'BARCODE-X' })
      const { core, opts } = setupCore({ rowData: ref([row]) })
      const result = core.handleBeforeSlotSubmit('1')
      expect(result).toBe(false)
      expect(opts.showError).toHaveBeenCalledWith(expect.stringContaining('S5566'))
    })

    it('站位 appendedMaterialInventoryIdno 為空 → 回傳 true', () => {
      const row = makeRow({ materialInventoryIdno: null, appendedMaterialInventoryIdno: '' })
      const { core, opts } = setupCore({ rowData: ref([row]) })
      const result = core.handleBeforeSlotSubmit('1')
      expect(result).toBe(true)
      expect(opts.showError).not.toHaveBeenCalled()
    })

    it('找不到槽位（rowData 為空）→ 不觸發守衛，回傳 true', () => {
      const { core, opts } = setupCore({ rowData: ref([]) })
      const result = core.handleBeforeSlotSubmit('1')
      expect(result).toBe(true)
      expect(opts.showError).not.toHaveBeenCalled()
    })

    it('模式切換觸發碼（S5555）→ 回傳 false，不觸發接料守衛', () => {
      const row = makeRow({ appendedMaterialInventoryIdno: 'BARCODE-X' })
      const { core, opts } = setupCore({ rowData: ref([row]) })
      const result = core.handleBeforeSlotSubmit('S5555')
      expect(result).toBe(false)
      expect(opts.showError).not.toHaveBeenCalled()
    })
  })

  describe('卸料流程 — 成功', () => {
    it('submitUnload 成功 → state machine 推進（進入 replace material phase）', async () => {
      const row = makeRow({ materialInventoryIdno: 'BARCODE-001' })
      const submitUnload = vi.fn().mockResolvedValue(true)
      const findUniqueUnloadSlotByPackCode = vi.fn().mockReturnValue({ ok: true, slotIdno: '1' })

      const { core } = setupCore(
        { rowData: ref([row]), submitUnload, findUniqueUnloadSlotByPackCode },
      )

      core.handleBeforeMaterialScan('S5555') // enter unload mode
      expect(core.isUnloadMode.value).toBe(true)
      expect(core.isUnloadScanPhase.value).toBe(true)

      core.unloadMaterialValue.value = 'BARCODE-001'
      core.handleUnloadMaterialEnter()
      await flushPromises()
      expect(submitUnload).toHaveBeenCalledWith({
        materialPackCode: 'BARCODE-001',
        slotIdno: '1',
      })
      // After success, machine transitions to replace material phase
      expect(core.isReplaceMaterialPhase.value).toBe(true)
    })

    it('submitUnload 回傳 false → state machine 不推進', async () => {
      const row = makeRow({ materialInventoryIdno: 'BARCODE-001' })
      const submitUnload = vi.fn().mockResolvedValue(false)
      const findUniqueUnloadSlotByPackCode = vi.fn().mockReturnValue({ ok: true, slotIdno: '1' })

      const { core } = setupCore(
        { rowData: ref([row]), submitUnload, findUniqueUnloadSlotByPackCode },
      )

      core.handleBeforeMaterialScan('S5555')
      expect(core.isUnloadScanPhase.value).toBe(true)

      core.unloadMaterialValue.value = 'BARCODE-001'
      core.handleUnloadMaterialEnter()
      await flushPromises()
      expect(submitUnload).toHaveBeenCalled()
      // Machine should NOT have transitioned
      expect(core.isUnloadScanPhase.value).toBe(true)
    })

    it('findUniqueUnloadSlotByPackCode 找不到 → showError', async () => {
      const submitUnload = vi.fn()
      const findUniqueUnloadSlotByPackCode = vi.fn().mockReturnValue({ ok: false, error: '找不到對應站位' })
      const { core, opts } = setupCore({ submitUnload, findUniqueUnloadSlotByPackCode })

      core.handleBeforeMaterialScan('S5555')
      core.unloadMaterialValue.value = 'BARCODE-X'
      core.handleUnloadMaterialEnter()
      await flushPromises()
      expect(opts.showError).toHaveBeenCalledWith('找不到對應站位')
      expect(submitUnload).not.toHaveBeenCalled()
    })
  })

  describe('強制卸料流程', () => {
    it('submitForceUnloadBySlot 成功 → state machine 推進離開卸料模式', async () => {
      const submitForceUnloadBySlot = vi.fn().mockResolvedValue({ ok: true, slotIdno: '1' })
      const { core } = setupCore({
        rowData: ref([makeRow()]),
        submitForceUnloadBySlot,
      })

      core.handleBeforeMaterialScan('S5577') // enter force unload mode
      expect(core.isForceUnloadSlotPhase.value).toBe(true)

      core.unloadSlotValue.value = '1'
      await core.handleUnloadSlotSubmit()
      await flushPromises()

      expect(submitForceUnloadBySlot).toHaveBeenCalledWith({
        slotIdno: '1',
        unfeedReason: 'WRONG_MATERIAL',
      })
      // After force unload, transitions to replace material phase (user scans replacement)
      expect(core.isReplaceMaterialPhase.value).toBe(true)
    })

    it('submitForceUnloadBySlot 失敗 → 停留在強制卸料 phase', async () => {
      const submitForceUnloadBySlot = vi.fn().mockResolvedValue({ ok: false })
      const { core } = setupCore({ submitForceUnloadBySlot })

      core.handleBeforeMaterialScan('S5577')
      expect(core.isForceUnloadSlotPhase.value).toBe(true)

      core.unloadSlotValue.value = '1'
      await core.handleUnloadSlotSubmit()
      await flushPromises()

      expect(submitForceUnloadBySlot).toHaveBeenCalled()
      // Should still be in force unload phase
      expect(core.isForceUnloadSlotPhase.value).toBe(true)
    })
  })

  describe('換料流程（replace slot phase）', () => {
    it('submitReplace 成功 → 退出卸料模式', async () => {
      const submitReplace = vi.fn().mockResolvedValue(true)
      const findUniqueUnloadSlotByPackCode = vi.fn().mockReturnValue({ ok: true, slotIdno: '1' })
      const submitUnload = vi.fn().mockResolvedValue(true)

      const { core } = setupCore({
        rowData: ref([makeRow()]),
        submitReplace,
        submitUnload,
        findUniqueUnloadSlotByPackCode,
      })

      // 1. Enter unload mode → unload scan phase
      core.handleBeforeMaterialScan('S5555')
      // 2. Submit material → moves to replace material phase
      core.unloadMaterialValue.value = 'BARCODE-001'
      core.handleUnloadMaterialEnter()
      await flushPromises()
      expect(core.isReplaceMaterialPhase.value).toBe(true)

      // 3. Submit replacement material → moves to replace slot phase
      core.unloadMaterialValue.value = 'BARCODE-NEW'
      core.handleUnloadMaterialEnter()
      await flushPromises()
      expect(core.isReplaceSlotPhase.value).toBe(true)

      // 4. Submit slot confirmation
      core.unloadSlotValue.value = '1'
      await core.handleUnloadSlotSubmit()
      expect(submitReplace).toHaveBeenCalledWith({
        materialPackCode: 'BARCODE-NEW',
        slotIdno: '1',
      })
      expect(core.isUnloadMode.value).toBe(false)
    })
  })

  describe('IPQC 模式 — 巡檢成功', () => {
    it('料號一致 → 更新 row.correct、呼叫 adapter.submitIpqcRow', async () => {
      const row = makeRow({ materialInventoryIdno: 'BARCODE-001', appendedMaterialInventoryIdno: 'BARCODE-001' })
      const submitIpqcRow = vi.fn().mockResolvedValue(undefined)
      const findRowBySlotInput = vi.fn().mockReturnValue(row)

      const { core } = setupCore(
        { rowData: ref([row]) },
        { findRowBySlotInput, submitIpqcRow },
      )

      core.handleBeforeMaterialScan('S5588')
      expect(core.isIpqcMode.value).toBe(true)

      core.ipqcMaterialValue.value = 'BARCODE-001'
      core.ipqcSlotValue.value = '1'
      await core.handleIpqcSlotSubmit()

      expect(row.correct).toBe('MATCHED_MATERIAL_PACK')
      expect(row.inspectorIdno).toBe('INSPECTOR-01')
      expect(row.inspectCount).toBe(1)
      expect(submitIpqcRow).toHaveBeenCalledWith(row, 'BARCODE-001', 'INSPECTOR-01')
    })

    it('afterIpqcRowUpdate 被呼叫（Panasonic remark 類似邏輯）', async () => {
      const row = makeRow({ materialInventoryIdno: 'BARCODE-001', appendedMaterialInventoryIdno: 'BARCODE-001' })
      const afterIpqcRowUpdate = vi.fn()
      const findRowBySlotInput = vi.fn().mockReturnValue(row)

      const { core } = setupCore(
        { rowData: ref([row]) },
        { findRowBySlotInput, afterIpqcRowUpdate },
      )

      core.handleBeforeMaterialScan('S5588')
      core.ipqcMaterialValue.value = 'BARCODE-001'
      core.ipqcSlotValue.value = '1'
      await core.handleIpqcSlotSubmit()

      expect(afterIpqcRowUpdate).toHaveBeenCalledWith(row)
    })

    it('料號不符 → showError，不呼叫 submitIpqcRow', async () => {
      const row = makeRow({ materialInventoryIdno: 'BARCODE-CORRECT', appendedMaterialInventoryIdno: 'BARCODE-CORRECT' })
      const submitIpqcRow = vi.fn()
      const findRowBySlotInput = vi.fn().mockReturnValue(row)

      const { core, opts } = setupCore(
        { rowData: ref([row]) },
        { findRowBySlotInput, submitIpqcRow },
      )

      core.handleBeforeMaterialScan('S5588')
      core.ipqcMaterialValue.value = 'BARCODE-WRONG'
      core.ipqcSlotValue.value = '1'
      await core.handleIpqcSlotSubmit()

      expect(opts.showError).toHaveBeenCalledWith(expect.stringContaining('料號不符'))
      expect(submitIpqcRow).not.toHaveBeenCalled()
    })
  })

  describe('IPQC 欄位顯示切換', () => {
    it('進入 IPQC 模式時顯示 IPQC 欄位', () => {
      const setColumnVisible = vi.fn()
      const toggleNormalColumnsForIpqc = vi.fn()
      const { core } = setupCore(
        { rowData: ref([makeRow()]) },
        { setColumnVisible, toggleNormalColumnsForIpqc },
      )

      core.handleBeforeMaterialScan('S5588')

      expect(setColumnVisible).toHaveBeenCalledWith('inspectMaterialPackCode', true)
      expect(setColumnVisible).toHaveBeenCalledWith('inspectTime', true)
      expect(setColumnVisible).toHaveBeenCalledWith('inspectorIdno', true)
      expect(toggleNormalColumnsForIpqc).toHaveBeenCalledWith(true)
    })

    it('退出 IPQC 模式時隱藏 IPQC 欄位', () => {
      const setColumnVisible = vi.fn()
      const toggleNormalColumnsForIpqc = vi.fn()
      const { core } = setupCore(
        { rowData: ref([makeRow()]) },
        { setColumnVisible, toggleNormalColumnsForIpqc },
      )

      core.handleBeforeMaterialScan('S5588')
      setColumnVisible.mockClear()
      toggleNormalColumnsForIpqc.mockClear()

      core.handleBeforeMaterialScan('S5588') // toggle off
      expect(setColumnVisible).toHaveBeenCalledWith('inspectMaterialPackCode', false)
      expect(setColumnVisible).toHaveBeenCalledWith('inspectTime', false)
      expect(setColumnVisible).toHaveBeenCalledWith('inspectorIdno', false)
      expect(toggleNormalColumnsForIpqc).toHaveBeenCalledWith(false)
    })
  })

  describe('validateIpqcMaterialPackCode', () => {
    it('未提供 validateIpqcMaterialPackCode 時，複用 validateUnloadMaterialPackCode（isMockMode=false）', async () => {
      const row = makeRow({ materialInventoryIdno: 'BARCODE-001' })
      const validateUnloadMaterialPackCode = vi.fn().mockResolvedValue(true)
      const findRowBySlotInput = vi.fn().mockReturnValue(row)

      const { core } = setupCore(
        { rowData: ref([row]), validateUnloadMaterialPackCode, isMockMode: false },
        { findRowBySlotInput },
      )

      core.handleBeforeMaterialScan('S5588')
      core.ipqcMaterialValue.value = 'BARCODE-001'
      await core.handleIpqcMaterialSubmit()

      expect(validateUnloadMaterialPackCode).toHaveBeenCalledWith('BARCODE-001')
    })

    it('提供 validateIpqcMaterialPackCode 時，使用獨立的驗證函數', async () => {
      const row = makeRow({ materialInventoryIdno: 'BARCODE-001' })
      const validateUnloadMaterialPackCode = vi.fn().mockResolvedValue(true)
      const validateIpqcMaterialPackCode = vi.fn().mockResolvedValue(true)
      const findRowBySlotInput = vi.fn().mockReturnValue(row)

      const { core } = setupCore(
        {
          rowData: ref([row]),
          validateUnloadMaterialPackCode,
          validateIpqcMaterialPackCode,
          isMockMode: false,
        },
        { findRowBySlotInput },
      )

      core.handleBeforeMaterialScan('S5588')
      core.ipqcMaterialValue.value = 'BARCODE-001'
      await core.handleIpqcMaterialSubmit()

      expect(validateIpqcMaterialPackCode).toHaveBeenCalledWith('BARCODE-001')
      expect(validateUnloadMaterialPackCode).not.toHaveBeenCalled()
    })
  })

  describe('toggleIpqcMode', () => {
    it('不在 IPQC 模式 → 進入 IPQC 模式', () => {
      const { core } = setupCore({ rowData: ref([makeRow()]) })
      expect(core.isIpqcMode.value).toBe(false)
      core.toggleIpqcMode()
      expect(core.isIpqcMode.value).toBe(true)
    })

    it('在 IPQC 模式 → 退出 IPQC 模式', () => {
      const { core } = setupCore({ rowData: ref([makeRow()]) })
      core.toggleIpqcMode()
      expect(core.isIpqcMode.value).toBe(true)
      core.toggleIpqcMode()
      expect(core.isIpqcMode.value).toBe(false)
    })
  })

  describe('模式觸發碼 toggle', () => {
    it('S5566 再掃一次 → 退出接料模式', async () => {
      const { core } = setupCore({ rowData: ref([makeRow()]) })

      core.handleBeforeMaterialScan('S5566')
      expect(core.isSpliceMode.value).toBe(true)

      core.spliceMaterialValue.value = 'S5566'
      core.handleSpliceMaterialEnter()
      await flushPromises()

      expect(core.isSpliceMode.value).toBe(false)
    })

    it('S5555 再掃一次 → 退出換料卸除模式', async () => {
      const { core } = setupCore({ rowData: ref([makeRow()]) })

      core.handleBeforeMaterialScan('S5555')
      expect(core.isUnloadScanPhase.value).toBe(true)

      core.unloadMaterialValue.value = 'S5555'
      core.handleUnloadMaterialEnter()
      await flushPromises()

      expect(core.isUnloadMode.value).toBe(false)
    })

    it('S5577 再掃一次 → 退出單站卸除模式', async () => {
      const { core } = setupCore({ rowData: ref([makeRow()]) })

      core.handleBeforeMaterialScan('S5577')
      expect(core.isForceUnloadSlotPhase.value).toBe(true)

      core.unloadSlotValue.value = 'S5577'
      await core.handleUnloadSlotSubmit()
      await flushPromises()

      expect(core.isUnloadMode.value).toBe(false)
    })

    it('S5555 與 S5577 可在卸料子模式間切換', async () => {
      const { core } = setupCore({ rowData: ref([makeRow()]) })

      core.handleBeforeMaterialScan('S5555')
      expect(core.isUnloadScanPhase.value).toBe(true)

      core.unloadMaterialValue.value = 'S5577'
      core.handleUnloadMaterialEnter()
      await flushPromises()
      expect(core.isForceUnloadSlotPhase.value).toBe(true)

      core.unloadSlotValue.value = 'S5555'
      await core.handleUnloadSlotSubmit()
      await flushPromises()
      expect(core.isUnloadScanPhase.value).toBe(true)
    })
  })
})
