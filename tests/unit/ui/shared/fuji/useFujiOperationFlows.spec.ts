import { defineComponent, nextTick, ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { useFujiOperationFlows } from '@/ui/shared/composables/fuji/useFujiOperationFlows'
import type { FujiOperationFlowsOptions } from '@/ui/shared/composables/fuji/useFujiOperationFlows'

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────

function makeOptions(overrides: Partial<FujiOperationFlowsOptions> = {}): FujiOperationFlowsOptions {
  return {
    getGridApi: () => null,
    rowData: ref([]),
    mounterData: ref([]),
    isTestingMode: ref(false),
    isMockMode: true, // skip real API validation by default
    showError: vi.fn(),
    handleUserSwitchTrigger: vi.fn().mockReturnValue(false),
    clearNormalScanState: vi.fn(),
    focusMaterialInput: vi.fn(),
    getUnloadMaterialInputRef: () => null,
    getUnloadSlotInputRef: () => null,
    submitUnload: vi.fn().mockResolvedValue(true),
    submitForceUnloadBySlot: vi.fn().mockResolvedValue({ ok: true, slotIdno: '25-A' }),
    findUniqueUnloadSlotByPackCode: vi.fn().mockReturnValue({ ok: true, slotIdno: '25-A' }),
    validateUnloadMaterialPackCode: vi.fn().mockResolvedValue(true),
    validateReplacementMaterialForSlot: vi.fn().mockResolvedValue(true),
    submitReplace: vi.fn().mockResolvedValue(true),
    inspectionUpload: vi.fn().mockResolvedValue(undefined),
    applyInspectionUpdate: vi.fn(),
    ...overrides,
  }
}

function setupComposable(overrides: Partial<FujiOperationFlowsOptions> = {}) {
  const options = makeOptions(overrides)
  let flows!: ReturnType<typeof useFujiOperationFlows>

  const wrapper = mount(defineComponent({
    setup() {
      flows = useFujiOperationFlows(options)
      return () => null
    },
  }))

  return { flows, options, wrapper }
}

// ────────────────────────────────────────────────────────────────
// Tests
// ────────────────────────────────────────────────────────────────

describe('useFujiOperationFlows', () => {
  describe('初始狀態', () => {
    it('isUnloadMode=false, isIpqcMode=false', () => {
      const { flows } = setupComposable()
      expect(flows.isUnloadMode.value).toBe(false)
      expect(flows.isIpqcMode.value).toBe(false)
    })

    it('operationModeName 初始為上料接料', () => {
      const { flows } = setupComposable()
      expect(flows.operationModeName.value).toContain('上料接料')
    })
  })

  describe('handleBeforeMaterialScan — 觸發碼', () => {
    it('S5555 → 進入 pack_auto_slot 卸除模式，回傳 false', async () => {
      const { flows } = setupComposable()
      const result = flows.handleBeforeMaterialScan('S5555')
      await nextTick()
      expect(result).toBe(false)
      expect(flows.isUnloadMode.value).toBe(true)
      expect(flows.isUnloadScanPhase.value).toBe(true)
    })

    it('S5577 → 進入 force_single_slot 卸除模式，回傳 false', async () => {
      const { flows } = setupComposable()
      const result = flows.handleBeforeMaterialScan('S5577')
      await nextTick()
      expect(result).toBe(false)
      expect(flows.isUnloadMode.value).toBe(true)
      expect(flows.isForceUnloadSlotPhase.value).toBe(true)
    })

    it('S5588 → 進入 IPQC 模式，回傳 false', async () => {
      const { flows } = setupComposable()
      const result = flows.handleBeforeMaterialScan('S5588')
      await nextTick()
      expect(result).toBe(false)
      expect(flows.isIpqcMode.value).toBe(true)
    })

    it('S5588 (已在 IPQC) → 退出 IPQC 模式', async () => {
      const { flows } = setupComposable()
      flows.handleBeforeMaterialScan('S5588')
      await nextTick()
      flows.handleBeforeMaterialScan('S5588')
      await nextTick()
      expect(flows.isIpqcMode.value).toBe(false)
    })

    it('S1111 → 呼叫 handleUserSwitchTrigger，回傳 false', () => {
      const handleUserSwitchTrigger = vi.fn().mockReturnValue(true)
      const { flows } = setupComposable({ handleUserSwitchTrigger })
      const result = flows.handleBeforeMaterialScan('S1111')
      expect(handleUserSwitchTrigger).toHaveBeenCalledWith('S1111')
      expect(result).toBe(false)
    })

    it('正常條碼 → 回傳 true（允許繼續）', () => {
      const { flows } = setupComposable()
      const result = flows.handleBeforeMaterialScan('MAT-001')
      expect(result).toBe(true)
    })
  })

  describe('pack_auto_slot 卸除流程', () => {
    it('handleUnloadMaterialEnter → submitUnload 成功 → 進入 REPLACE_MATERIAL_SCAN', async () => {
      const submitUnload = vi.fn().mockResolvedValue(true)
      const findUniqueUnloadSlotByPackCode = vi.fn().mockReturnValue({ ok: true, slotIdno: '25-A' })
      const { flows } = setupComposable({ submitUnload, findUniqueUnloadSlotByPackCode })

      flows.handleBeforeMaterialScan('S5555')
      await nextTick()

      flows.unloadMaterialValue.value = 'MAT-001'
      flows.handleUnloadMaterialEnter()
      await flushPromises()

      expect(submitUnload).toHaveBeenCalledWith({ materialPackCode: 'MAT-001', slotIdno: '25-A' })
      expect(flows.isReplaceMaterialPhase.value).toBe(true)
    })

    it('submitUnload 失敗 → 停在 UNLOAD_SCAN', async () => {
      const submitUnload = vi.fn().mockResolvedValue(false)
      const { flows } = setupComposable({ submitUnload })

      flows.handleBeforeMaterialScan('S5555')
      await nextTick()
      flows.unloadMaterialValue.value = 'MAT-001'
      flows.handleUnloadMaterialEnter()
      await flushPromises()

      expect(flows.isUnloadScanPhase.value).toBe(true)
    })

    it('handleUnloadMaterialEnter 在 REPLACE_MATERIAL_SCAN → onReplacementMaterialScanned 後進入 REPLACE_SLOT_SCAN', async () => {
      const submitUnload = vi.fn().mockResolvedValue(true)
      const validateReplacementMaterialForSlot = vi.fn().mockResolvedValue(true)
      const { flows } = setupComposable({ submitUnload, validateReplacementMaterialForSlot })

      flows.handleBeforeMaterialScan('S5555')
      await nextTick()
      flows.unloadMaterialValue.value = 'MAT-001'
      flows.handleUnloadMaterialEnter()
      await flushPromises()

      // 現在在 REPLACE_MATERIAL_SCAN
      flows.unloadMaterialValue.value = 'MAT-NEW'
      flows.handleUnloadMaterialEnter()
      await flushPromises()

      expect(flows.isReplaceSlotPhase.value).toBe(true)
    })
  })

  describe('force_single_slot 卸除流程', () => {
    it('handleUnloadSlotSubmit → submitForceUnloadBySlot 成功 → REPLACE_MATERIAL_SCAN', async () => {
      const submitForceUnloadBySlot = vi.fn().mockResolvedValue({ ok: true, slotIdno: '30-B' })
      const { flows } = setupComposable({ submitForceUnloadBySlot })

      flows.handleBeforeMaterialScan('S5577')
      await nextTick()

      flows.unloadSlotValue.value = 'T-30-B'
      await flows.handleUnloadSlotSubmit()
      await flushPromises()

      expect(submitForceUnloadBySlot).toHaveBeenCalled()
      expect(flows.isReplaceMaterialPhase.value).toBe(true)
    })

    it('submitForceUnloadBySlot 失敗 → 停在 FORCE_SLOT_SCAN', async () => {
      const submitForceUnloadBySlot = vi.fn().mockResolvedValue({ ok: false })
      const { flows } = setupComposable({ submitForceUnloadBySlot })

      flows.handleBeforeMaterialScan('S5577')
      await nextTick()
      flows.unloadSlotValue.value = 'T-30-B'
      await flows.handleUnloadSlotSubmit()
      await flushPromises()

      expect(flows.isForceUnloadSlotPhase.value).toBe(true)
    })
  })

  describe('handleExitUnloadMode', () => {
    it('從 UNLOAD_SCAN 退出 → 回到 NORMAL，呼叫 focusMaterialInput', async () => {
      const focusMaterialInput = vi.fn()
      const { flows } = setupComposable({ focusMaterialInput })

      flows.handleBeforeMaterialScan('S5555')
      await nextTick()
      flows.handleExitUnloadMode()
      await nextTick()

      expect(flows.isUnloadMode.value).toBe(false)
      expect(focusMaterialInput).toHaveBeenCalled()
    })
  })

  describe('IPQC 模式', () => {
    it('enterIpqcMode 時呼叫 clearNormalScanState', async () => {
      const clearNormalScanState = vi.fn()
      const { flows } = setupComposable({ clearNormalScanState })

      flows.handleBeforeMaterialScan('S5588')
      await nextTick()

      expect(clearNormalScanState).toHaveBeenCalled()
    })

    it('exitIpqcMode 後 isIpqcMode=false，呼叫 focusMaterialInput', async () => {
      const focusMaterialInput = vi.fn()
      const { flows } = setupComposable({ focusMaterialInput })

      flows.handleBeforeMaterialScan('S5588')
      await nextTick()
      flows.exitIpqcMode()
      await nextTick()

      expect(flows.isIpqcMode.value).toBe(false)
      expect(focusMaterialInput).toHaveBeenCalled()
    })

    it('handleIpqcMaterialSubmit — S5566 → 退出 IPQC', async () => {
      const { flows } = setupComposable()

      flows.handleBeforeMaterialScan('S5588')
      await nextTick()

      flows.ipqcMaterialValue.value = 'S5566'
      await flows.handleIpqcMaterialSubmit()
      await nextTick()

      expect(flows.isIpqcMode.value).toBe(false)
    })

    it('handleIpqcMaterialSubmit — S5555 → 退出 IPQC 並進入卸除模式', async () => {
      const { flows } = setupComposable()

      flows.handleBeforeMaterialScan('S5588')
      await nextTick()

      flows.ipqcMaterialValue.value = 'S5555'
      await flows.handleIpqcMaterialSubmit()
      await nextTick()

      expect(flows.isUnloadMode.value).toBe(true)
      expect(flows.isUnloadScanPhase.value).toBe(true)
    })
  })

  describe('operationModeName', () => {
    it('UNLOAD pack_auto_slot → 顯示換料卸除', async () => {
      const { flows } = setupComposable()
      flows.handleBeforeMaterialScan('S5555')
      await nextTick()
      expect(flows.operationModeName.value).toContain('換料卸除')
    })

    it('UNLOAD force_single_slot → 顯示單站卸除', async () => {
      const { flows } = setupComposable()
      flows.handleBeforeMaterialScan('S5577')
      await nextTick()
      expect(flows.operationModeName.value).toContain('單站卸除')
    })

    it('IPQC → 顯示 IPQC覆檢', async () => {
      const { flows } = setupComposable()
      flows.handleBeforeMaterialScan('S5588')
      await nextTick()
      expect(flows.operationModeName.value).toContain('IPQC覆檢')
    })
  })
})
