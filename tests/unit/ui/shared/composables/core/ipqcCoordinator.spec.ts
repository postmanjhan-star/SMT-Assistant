import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { CheckMaterialMatchEnum } from '@/client'
import { createIpqcCoordinator } from '@/ui/shared/composables/core/flows/ipqcCoordinator'
import { CORRECT_STATE } from '@/ui/shared/composables/core/flows/materialPackCodeHelpers'

type SetupOverrides = {
  rowData?: any[]
  resolveResult?: CheckMaterialMatchEnum | null
  currentPackCodeByRow?: (row: any) => string
  findRow?: (slot: string) => any | null
}

function makeSetup(overrides: SetupOverrides = {}) {
  const rowData = ref(overrides.rowData ?? [])
  const pendingIpqcRecords = ref<any[]>([])

  const machine = {
    enterIpqcMode: vi.fn(),
    exitToNormal: vi.fn(),
  }
  const adapter = {
    setColumnVisible: vi.fn(),
    toggleNormalColumnsForIpqc: vi.fn(),
    toRowKey: (row: any) => String(row.slotIdno),
    buildIpqcRecord: vi.fn().mockImplementation((_row, params) => ({ ...params })),
  }
  const resolveExistenceBasedCorrectState = vi
    .fn()
    .mockResolvedValue(
      'resolveResult' in overrides ? overrides.resolveResult : CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK,
    )
  const getCurrentPackCode = vi
    .fn()
    .mockImplementation(overrides.currentPackCodeByRow ?? ((row: any) => String(row.materialInventoryIdno ?? '')))
  const findRowBySlotIdno = vi
    .fn()
    .mockImplementation(overrides.findRow ?? ((slot: string) => rowData.value.find((r: any) => String(r.slotIdno) === slot) ?? null))
  const updateRowInGrid = vi.fn()
  const showError = vi.fn()
  const clearNormalScanState = vi.fn()
  const focusMaterialInput = vi.fn()
  const persistNow = vi.fn()
  const handleUserSwitchTrigger = vi.fn().mockReturnValue(true)
  const enterSpliceMode = vi.fn()
  const enterUnloadMode = vi.fn()

  const coord = createIpqcCoordinator({
    machine,
    adapter: adapter as any,
    rowData,
    currentUsername: ref('INSPECTOR-01'),
    pendingIpqcRecords,
    resolveExistenceBasedCorrectState,
    getCurrentPackCode,
    findRowBySlotIdno,
    updateRowInGrid,
    showError,
    clearNormalScanState,
    focusMaterialInput,
    persistNow,
    handleUserSwitchTrigger,
    enterSpliceMode,
    enterUnloadMode,
  })

  return {
    coord,
    rowData,
    pendingIpqcRecords,
    machine,
    adapter,
    resolveExistenceBasedCorrectState,
    getCurrentPackCode,
    findRowBySlotIdno,
    updateRowInGrid,
    showError,
    clearNormalScanState,
    focusMaterialInput,
    persistNow,
    handleUserSwitchTrigger,
    enterSpliceMode,
    enterUnloadMode,
  }
}

describe('createIpqcCoordinator', () => {
  describe('enterIpqcMode', () => {
    it('切入 IPQC 模式：快照 row.correct、設 UNLOADED、顯示 IPQC 欄位', () => {
      const row1 = { slotIdno: '1', correct: CORRECT_STATE.MATCHED }
      const row2 = { slotIdno: '2', correct: CORRECT_STATE.MATCHED }
      const s = makeSetup({ rowData: [row1, row2] })

      s.coord.enterIpqcMode()

      expect(s.machine.enterIpqcMode).toHaveBeenCalled()
      expect(s.clearNormalScanState).toHaveBeenCalled()
      expect(row1.correct).toBe(CORRECT_STATE.UNLOADED)
      expect(row2.correct).toBe(CORRECT_STATE.UNLOADED)
      expect(s.updateRowInGrid).toHaveBeenCalledTimes(2)
      expect(s.adapter.setColumnVisible).toHaveBeenCalledWith('inspectMaterialPackCode', true)
      expect(s.adapter.setColumnVisible).toHaveBeenCalledWith('inspectTime', true)
      expect(s.adapter.toggleNormalColumnsForIpqc).toHaveBeenCalledWith(true)
    })
  })

  describe('exitIpqcMode', () => {
    it('離開 IPQC 模式：還原原本的 correct 狀態並隱藏欄位', () => {
      const row = { slotIdno: '1', correct: CORRECT_STATE.MATCHED }
      const s = makeSetup({ rowData: [row] })

      s.coord.enterIpqcMode()
      expect(row.correct).toBe(CORRECT_STATE.UNLOADED)

      s.coord.exitIpqcMode()
      expect(s.machine.exitToNormal).toHaveBeenCalled()
      expect(row.correct).toBe(CORRECT_STATE.MATCHED)
      expect(s.adapter.setColumnVisible).toHaveBeenCalledWith('inspectMaterialPackCode', false)
      expect(s.focusMaterialInput).toHaveBeenCalled()
      expect(s.coord.ipqcMaterialValue.value).toBe('')
      expect(s.coord.ipqcSlotValue.value).toBe('')
    })
  })

  describe('handleIpqcMaterialSubmit – mode triggers', () => {
    it('IPQC_TRIGGER → exitIpqcMode 且清空輸入', async () => {
      const s = makeSetup({ rowData: [{ slotIdno: '1', correct: CORRECT_STATE.MATCHED }] })
      s.coord.enterIpqcMode()
      s.coord.ipqcMaterialValue.value = 'S5588'
      await s.coord.handleIpqcMaterialSubmit()
      expect(s.machine.exitToNormal).toHaveBeenCalled()
      expect(s.coord.ipqcMaterialValue.value).toBe('')
    })

    it('SPLICE_TRIGGER → exit + enterSpliceMode', async () => {
      const s = makeSetup()
      s.coord.ipqcMaterialValue.value = 'S5566'
      await s.coord.handleIpqcMaterialSubmit()
      expect(s.enterSpliceMode).toHaveBeenCalled()
    })

    it('USER_SWITCH_TRIGGER → exit + handleUserSwitchTrigger', async () => {
      const s = makeSetup()
      s.coord.ipqcMaterialValue.value = 'S1111'
      await s.coord.handleIpqcMaterialSubmit()
      expect(s.handleUserSwitchTrigger).toHaveBeenCalledWith('S1111')
    })

    it('UNLOAD_TRIGGER → exit + enterUnloadMode("pack_auto_slot")', async () => {
      const s = makeSetup()
      s.coord.ipqcMaterialValue.value = 'S5555'
      await s.coord.handleIpqcMaterialSubmit()
      expect(s.enterUnloadMode).toHaveBeenCalledWith('pack_auto_slot')
    })

    it('FORCE_UNLOAD_TRIGGER → exit + enterUnloadMode("force_single_slot")', async () => {
      const s = makeSetup()
      s.coord.ipqcMaterialValue.value = 'S5577'
      await s.coord.handleIpqcMaterialSubmit()
      expect(s.enterUnloadMode).toHaveBeenCalledWith('force_single_slot')
    })
  })

  describe('handleIpqcMaterialSubmit – validation', () => {
    it('空字串直接 return，不呼叫 resolve', async () => {
      const s = makeSetup()
      s.coord.ipqcMaterialValue.value = '   '
      await s.coord.handleIpqcMaterialSubmit()
      expect(s.resolveExistenceBasedCorrectState).not.toHaveBeenCalled()
    })

    it('resolve 查到 → 設置 checkPackCodeMatch 並保留輸入值', async () => {
      const s = makeSetup()
      s.coord.ipqcMaterialValue.value = 'PACK-01'
      await s.coord.handleIpqcMaterialSubmit()
      expect(s.coord.ipqcCheckPackCodeMatch.value).toBe(CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK)
      expect(s.coord.ipqcMaterialValue.value).toBe('PACK-01')
    })

    it('resolve 查無(null) → 清空輸入值', async () => {
      const s = makeSetup({ resolveResult: null })
      s.coord.ipqcMaterialValue.value = 'PACK-01'
      await s.coord.handleIpqcMaterialSubmit()
      expect(s.coord.ipqcMaterialValue.value).toBe('')
    })
  })

  describe('handleIpqcSlotSubmit', () => {
    it('空輸入直接 return', () => {
      const s = makeSetup()
      s.coord.ipqcSlotValue.value = ''
      s.coord.handleIpqcSlotSubmit()
      expect(s.findRowBySlotIdno).not.toHaveBeenCalled()
    })

    it('IPQC_TRIGGER 觸發 → exitIpqcMode', () => {
      const s = makeSetup()
      s.coord.ipqcSlotValue.value = 'S5588'
      s.coord.handleIpqcSlotSubmit()
      expect(s.machine.exitToNormal).toHaveBeenCalled()
    })

    it('找不到 row → 錯誤', () => {
      const s = makeSetup({ findRow: () => null })
      s.coord.ipqcSlotValue.value = '99'
      s.coord.handleIpqcSlotSubmit()
      expect(s.showError).toHaveBeenCalledWith(expect.stringContaining('找不到槽位 99'))
      expect(s.coord.ipqcSlotValue.value).toBe('')
    })

    it('料號不符 → 錯誤並清空兩個輸入', () => {
      const row = { slotIdno: '1', materialInventoryIdno: 'PACK-REAL' }
      const s = makeSetup({ rowData: [row] })
      s.coord.ipqcMaterialValue.value = 'PACK-WRONG'
      s.coord.ipqcCheckPackCodeMatch.value = CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK
      s.coord.ipqcSlotValue.value = '1'
      s.coord.handleIpqcSlotSubmit()
      expect(s.showError).toHaveBeenCalledWith(expect.stringContaining('料號不符'))
      expect(s.coord.ipqcSlotValue.value).toBe('')
      expect(s.coord.ipqcMaterialValue.value).toBe('')
    })

    it('正常提交 → 更新 row、push pendingIpqcRecords、persist', () => {
      const row = {
        slotIdno: '1',
        materialInventoryIdno: 'PACK-01',
        correct: CORRECT_STATE.MATCHED,
        inspectCount: 0,
      }
      const s = makeSetup({ rowData: [row] })
      s.coord.ipqcMaterialValue.value = 'PACK-01'
      s.coord.ipqcCheckPackCodeMatch.value = CheckMaterialMatchEnum.TESTING_MATERIAL_PACK
      s.coord.ipqcSlotValue.value = '1'
      s.coord.handleIpqcSlotSubmit()

      expect(row.inspectCount).toBe(1)
      expect(row.correct).toBe(CheckMaterialMatchEnum.TESTING_MATERIAL_PACK)
      expect(s.pendingIpqcRecords.value).toHaveLength(1)
      expect(s.pendingIpqcRecords.value[0]).toMatchObject({
        slotIdno: '1',
        materialPackCode: 'PACK-01',
        checkPackCodeMatch: CheckMaterialMatchEnum.TESTING_MATERIAL_PACK,
      })
      expect(s.persistNow).toHaveBeenCalled()
      expect(s.coord.ipqcCheckPackCodeMatch.value).toBeNull()
      expect(s.coord.ipqcSlotValue.value).toBe('')
      expect(s.coord.ipqcMaterialValue.value).toBe('')
    })

    it('checkPackCodeMatch 為 null 時 fallback 到 MATCHED', () => {
      const row = {
        slotIdno: '1',
        materialInventoryIdno: 'PACK-01',
        correct: CORRECT_STATE.MATCHED,
        inspectCount: 0,
      }
      const s = makeSetup({ rowData: [row] })
      s.coord.ipqcMaterialValue.value = 'PACK-01'
      s.coord.ipqcCheckPackCodeMatch.value = null
      s.coord.ipqcSlotValue.value = '1'
      s.coord.handleIpqcSlotSubmit()
      expect(row.correct).toBe(CORRECT_STATE.MATCHED)
    })
  })

  describe('onIpqcUploaded', () => {
    it('ok=true 時清空 pendingIpqcRecords 並 persist', () => {
      const s = makeSetup()
      s.pendingIpqcRecords.value = [{ any: 1 } as any]
      s.coord.onIpqcUploaded(true)
      expect(s.pendingIpqcRecords.value).toEqual([])
      expect(s.persistNow).toHaveBeenCalled()
    })

    it('ok=false 時不清空', () => {
      const s = makeSetup()
      s.pendingIpqcRecords.value = [{ any: 1 } as any]
      s.coord.onIpqcUploaded(false)
      expect(s.pendingIpqcRecords.value).toHaveLength(1)
      expect(s.persistNow).not.toHaveBeenCalled()
    })
  })
})
