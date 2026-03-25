import { defineComponent, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { useOperationModeStateMachine } from '@/ui/shared/composables/useOperationModeStateMachine'

// 用一個空白 component 包住 composable，取得 Vue reactivity 環境
function setupComposable() {
  let machine!: ReturnType<typeof useOperationModeStateMachine>

  const wrapper = mount(defineComponent({
    setup() {
      machine = useOperationModeStateMachine()
      return () => null
    },
  }))

  return { machine, wrapper }
}

describe('useOperationModeStateMachine', () => {
  describe('初始狀態', () => {
    it('isNormal=true，其他都是 false', () => {
      const { machine } = setupComposable()
      expect(machine.isNormal.value).toBe(true)
      expect(machine.isIpqcMode.value).toBe(false)
      expect(machine.isUnloadMode.value).toBe(false)
    })

    it('所有 phase flags 都是 false', () => {
      const { machine } = setupComposable()
      expect(machine.isUnloadScanPhase.value).toBe(false)
      expect(machine.isForceUnloadSlotPhase.value).toBe(false)
      expect(machine.isReplaceMaterialPhase.value).toBe(false)
      expect(machine.isReplaceSlotPhase.value).toBe(false)
    })
  })

  describe('enterUnloadMode', () => {
    it('pack_auto_slot → isUnloadMode=true, isUnloadScanPhase=true', async () => {
      const { machine } = setupComposable()
      machine.enterUnloadMode('pack_auto_slot')
      await nextTick()
      expect(machine.isUnloadMode.value).toBe(true)
      expect(machine.isUnloadScanPhase.value).toBe(true)
      expect(machine.isNormal.value).toBe(false)
    })

    it('force_single_slot → isForceUnloadSlotPhase=true', async () => {
      const { machine } = setupComposable()
      machine.enterUnloadMode('force_single_slot')
      await nextTick()
      expect(machine.isForceUnloadSlotPhase.value).toBe(true)
      expect(machine.unloadModeType.value).toBe('force_single_slot')
    })
  })

  describe('enterIpqcMode', () => {
    it('isIpqcMode=true, isNormal=false', async () => {
      const { machine } = setupComposable()
      machine.enterIpqcMode()
      await nextTick()
      expect(machine.isIpqcMode.value).toBe(true)
      expect(machine.isNormal.value).toBe(false)
    })

    it('從 UNLOAD 進入 IPQC，互斥切換', async () => {
      const { machine } = setupComposable()
      machine.enterUnloadMode('pack_auto_slot')
      await nextTick()
      machine.enterIpqcMode()
      await nextTick()
      expect(machine.isIpqcMode.value).toBe(true)
      expect(machine.isUnloadMode.value).toBe(false)
    })
  })

  describe('context 響應性', () => {
    it('onUnloadSubmitted 後 resolvedUnloadSlotIdno 更新', async () => {
      const { machine } = setupComposable()
      machine.enterUnloadMode('pack_auto_slot')
      await nextTick()
      machine.onUnloadSubmitted('25-A')
      await nextTick()
      expect(machine.resolvedUnloadSlotIdno.value).toBe('25-A')
      expect(machine.isReplaceMaterialPhase.value).toBe(true)
    })

    it('onReplacementMaterialScanned 後 replacementMaterialPackCode 更新', async () => {
      const { machine } = setupComposable()
      machine.enterUnloadMode('pack_auto_slot')
      machine.onUnloadSubmitted('25-A')
      await nextTick()
      machine.onReplacementMaterialScanned('MAT-999')
      await nextTick()
      expect(machine.replacementMaterialPackCode.value).toBe('MAT-999')
      expect(machine.isReplaceSlotPhase.value).toBe(true)
    })

    it('onReplaceSlotSubmitted 後回到 NORMAL，context 清空', async () => {
      const { machine } = setupComposable()
      machine.enterUnloadMode('pack_auto_slot')
      machine.onUnloadSubmitted('25-A')
      machine.onReplacementMaterialScanned('MAT-999')
      await nextTick()
      machine.onReplaceSlotSubmitted()
      await nextTick()
      expect(machine.isNormal.value).toBe(true)
      expect(machine.resolvedUnloadSlotIdno.value).toBe('')
      expect(machine.replacementMaterialPackCode.value).toBe('')
    })
  })

  describe('exitToNormal', () => {
    it('從 IPQC 退出', async () => {
      const { machine } = setupComposable()
      machine.enterIpqcMode()
      await nextTick()
      machine.exitToNormal()
      await nextTick()
      expect(machine.isNormal.value).toBe(true)
    })

    it('從 UNLOAD 退出', async () => {
      const { machine } = setupComposable()
      machine.enterUnloadMode('pack_auto_slot')
      await nextTick()
      machine.exitToNormal()
      await nextTick()
      expect(machine.isNormal.value).toBe(true)
      expect(machine.isUnloadMode.value).toBe(false)
    })
  })

  describe('onUnmounted 時 actor 停止', () => {
    it('unmount 後不再 throw', async () => {
      const { wrapper, machine } = setupComposable()
      wrapper.unmount()
      // 送事件不應拋出（actor 已停止，事件被靜默忽略）
      expect(() => machine.enterUnloadMode('pack_auto_slot')).not.toThrow()
    })
  })
})
