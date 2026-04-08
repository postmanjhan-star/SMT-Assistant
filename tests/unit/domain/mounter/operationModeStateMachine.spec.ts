import { createActor } from 'xstate'
import { operationModeStateMachine } from '@/domain/mounter/operationModeStateMachine'

// 建立一個 actor 並回傳 snapshot 的快捷函式
function makeActor() {
  return createActor(operationModeStateMachine).start()
}

function stateValue(actor: ReturnType<typeof makeActor>) {
  return actor.getSnapshot().value
}

function context(actor: ReturnType<typeof makeActor>) {
  return actor.getSnapshot().context
}

describe('operationModeStateMachine', () => {
  describe('初始狀態', () => {
    it('從 NORMAL 開始', () => {
      const actor = makeActor()
      expect(stateValue(actor)).toBe('NORMAL')
    })

    it('初始 context 全部為空值', () => {
      const actor = makeActor()
      expect(context(actor)).toEqual({
        unloadModeType: 'pack_auto_slot',
        resolvedUnloadSlotIdno: '',
        replacementMaterialPackCode: '',
        spliceSlotIdno: '',
        spliceNewPackCode: '',
      })
    })
  })

  describe('NORMAL → UNLOAD', () => {
    it('ENTER_UNLOAD(pack_auto_slot) → UNLOAD.UNLOAD_SCAN', () => {
      const actor = makeActor()
      actor.send({ type: 'ENTER_UNLOAD', modeType: 'pack_auto_slot' })
      expect(stateValue(actor)).toEqual({ UNLOAD: 'UNLOAD_SCAN' })
    })

    it('ENTER_UNLOAD(force_single_slot) → UNLOAD.FORCE_SLOT_SCAN', () => {
      const actor = makeActor()
      actor.send({ type: 'ENTER_UNLOAD', modeType: 'force_single_slot' })
      expect(stateValue(actor)).toEqual({ UNLOAD: 'FORCE_SLOT_SCAN' })
    })

    it('ENTER_UNLOAD 設定 context.unloadModeType', () => {
      const actor = makeActor()
      actor.send({ type: 'ENTER_UNLOAD', modeType: 'force_single_slot' })
      expect(context(actor).unloadModeType).toBe('force_single_slot')
    })

    it('ENTER_UNLOAD 清空 context 中的殘留資料', () => {
      // 先完成一次換料流程，再重新進入
      const actor = makeActor()
      actor.send({ type: 'ENTER_UNLOAD', modeType: 'pack_auto_slot' })
      actor.send({ type: 'UNLOAD_SUBMITTED', resolvedSlotIdno: 'OLD-SLOT' })
      actor.send({ type: 'REPLACEMENT_MATERIAL_SCANNED', packCode: 'OLD-MAT' })
      actor.send({ type: 'EXIT_TO_NORMAL' })
      actor.send({ type: 'ENTER_UNLOAD', modeType: 'pack_auto_slot' })
      expect(context(actor).resolvedUnloadSlotIdno).toBe('')
      expect(context(actor).replacementMaterialPackCode).toBe('')
    })
  })

  describe('NORMAL → IPQC', () => {
    it('ENTER_IPQC → IPQC', () => {
      const actor = makeActor()
      actor.send({ type: 'ENTER_IPQC' })
      expect(stateValue(actor)).toBe('IPQC')
    })
  })

  describe('UNLOAD 子流程 pack_auto_slot', () => {
    it('UNLOAD_SUBMITTED → REPLACE_MATERIAL_SCAN，且記錄 resolvedSlotIdno', () => {
      const actor = makeActor()
      actor.send({ type: 'ENTER_UNLOAD', modeType: 'pack_auto_slot' })
      actor.send({ type: 'UNLOAD_SUBMITTED', resolvedSlotIdno: '25-A' })
      expect(stateValue(actor)).toEqual({ UNLOAD: 'REPLACE_MATERIAL_SCAN' })
      expect(context(actor).resolvedUnloadSlotIdno).toBe('25-A')
    })

    it('REPLACEMENT_MATERIAL_SCANNED → REPLACE_SLOT_SCAN，且記錄 packCode', () => {
      const actor = makeActor()
      actor.send({ type: 'ENTER_UNLOAD', modeType: 'pack_auto_slot' })
      actor.send({ type: 'UNLOAD_SUBMITTED', resolvedSlotIdno: '25-A' })
      actor.send({ type: 'REPLACEMENT_MATERIAL_SCANNED', packCode: 'MAT-999' })
      expect(stateValue(actor)).toEqual({ UNLOAD: 'REPLACE_SLOT_SCAN' })
      expect(context(actor).replacementMaterialPackCode).toBe('MAT-999')
    })

    it('REPLACE_SLOT_SUBMITTED → NORMAL，且清空 context', () => {
      const actor = makeActor()
      actor.send({ type: 'ENTER_UNLOAD', modeType: 'pack_auto_slot' })
      actor.send({ type: 'UNLOAD_SUBMITTED', resolvedSlotIdno: '25-A' })
      actor.send({ type: 'REPLACEMENT_MATERIAL_SCANNED', packCode: 'MAT-999' })
      actor.send({ type: 'REPLACE_SLOT_SUBMITTED' })
      expect(stateValue(actor)).toBe('NORMAL')
      expect(context(actor).resolvedUnloadSlotIdno).toBe('')
      expect(context(actor).replacementMaterialPackCode).toBe('')
    })
  })

  describe('UNLOAD 子流程 force_single_slot', () => {
    it('FORCE_UNLOAD_SUBMITTED → REPLACE_MATERIAL_SCAN，且記錄 resolvedSlotIdno', () => {
      const actor = makeActor()
      actor.send({ type: 'ENTER_UNLOAD', modeType: 'force_single_slot' })
      actor.send({ type: 'FORCE_UNLOAD_SUBMITTED', resolvedSlotIdno: '30-B' })
      expect(stateValue(actor)).toEqual({ UNLOAD: 'REPLACE_MATERIAL_SCAN' })
      expect(context(actor).resolvedUnloadSlotIdno).toBe('30-B')
    })
  })

  describe('互斥守護', () => {
    it('IPQC 模式中觸發 ENTER_UNLOAD → 切換到 UNLOAD（互斥）', () => {
      const actor = makeActor()
      actor.send({ type: 'ENTER_IPQC' })
      actor.send({ type: 'ENTER_UNLOAD', modeType: 'pack_auto_slot' })
      expect(stateValue(actor)).toEqual({ UNLOAD: 'UNLOAD_SCAN' })
    })

    it('UNLOAD 模式中觸發 ENTER_IPQC → 切換到 IPQC（互斥）', () => {
      const actor = makeActor()
      actor.send({ type: 'ENTER_UNLOAD', modeType: 'pack_auto_slot' })
      actor.send({ type: 'ENTER_IPQC' })
      expect(stateValue(actor)).toBe('IPQC')
    })

    it('UNLOAD 子狀態中觸發 ENTER_IPQC → 切換到 IPQC', () => {
      const actor = makeActor()
      actor.send({ type: 'ENTER_UNLOAD', modeType: 'pack_auto_slot' })
      actor.send({ type: 'UNLOAD_SUBMITTED', resolvedSlotIdno: '25-A' })
      // 現在在 REPLACE_MATERIAL_SCAN
      actor.send({ type: 'ENTER_IPQC' })
      expect(stateValue(actor)).toBe('IPQC')
    })
  })

  describe('EXIT_TO_NORMAL', () => {
    it('從 IPQC 退出 → NORMAL', () => {
      const actor = makeActor()
      actor.send({ type: 'ENTER_IPQC' })
      actor.send({ type: 'EXIT_TO_NORMAL' })
      expect(stateValue(actor)).toBe('NORMAL')
    })

    it('從 UNLOAD 任意子狀態退出 → NORMAL，且清空 context', () => {
      const actor = makeActor()
      actor.send({ type: 'ENTER_UNLOAD', modeType: 'pack_auto_slot' })
      actor.send({ type: 'UNLOAD_SUBMITTED', resolvedSlotIdno: '25-A' })
      actor.send({ type: 'EXIT_TO_NORMAL' })
      expect(stateValue(actor)).toBe('NORMAL')
      expect(context(actor).resolvedUnloadSlotIdno).toBe('')
    })
  })

  describe('ENTER_UNLOAD 連續觸發', () => {
    it('在 UNLOAD 中再次 ENTER_UNLOAD(force_single_slot) → 切換到 FORCE_SLOT_SCAN', () => {
      const actor = makeActor()
      actor.send({ type: 'ENTER_UNLOAD', modeType: 'pack_auto_slot' })
      actor.send({ type: 'UNLOAD_SUBMITTED', resolvedSlotIdno: '25-A' })
      // 現在在 REPLACE_MATERIAL_SCAN，改為 force 模式
      actor.send({ type: 'ENTER_UNLOAD', modeType: 'force_single_slot' })
      expect(stateValue(actor)).toEqual({ UNLOAD: 'FORCE_SLOT_SCAN' })
      expect(context(actor).resolvedUnloadSlotIdno).toBe('')
    })

    it('在 UNLOAD 中再次 ENTER_UNLOAD(相同 modeType) → 回到 NORMAL', () => {
      const actor = makeActor()
      actor.send({ type: 'ENTER_UNLOAD', modeType: 'pack_auto_slot' })
      actor.send({ type: 'ENTER_UNLOAD', modeType: 'pack_auto_slot' })
      expect(stateValue(actor)).toBe('NORMAL')
      expect(context(actor).resolvedUnloadSlotIdno).toBe('')
      expect(context(actor).replacementMaterialPackCode).toBe('')
    })
  })

  describe('IPQC toggle', () => {
    it('在 IPQC 中再次 ENTER_IPQC → 回到 NORMAL（toggle off）', () => {
      const actor = makeActor()
      actor.send({ type: 'ENTER_IPQC' })
      actor.send({ type: 'ENTER_IPQC' })
      expect(stateValue(actor)).toBe('NORMAL')
    })
  })

  describe('SPLICE toggle', () => {
    it('在 SPLICE 中再次 ENTER_SPLICE → 回到 NORMAL（toggle off）', () => {
      const actor = makeActor()
      actor.send({ type: 'ENTER_SPLICE' })
      actor.send({ type: 'ENTER_SPLICE' })
      expect(stateValue(actor)).toBe('NORMAL')
      expect(context(actor).spliceSlotIdno).toBe('')
      expect(context(actor).spliceNewPackCode).toBe('')
    })
  })
})
