import { ref, nextTick } from "vue"
import { useUnloadModeController } from "@/ui/shared/composables/useUnloadModeController"
import {
  MATERIAL_FORCE_UNLOAD_MODE_NAME,
  MATERIAL_UNLOAD_MODE_NAME,
  MATERIAL_IPQC_MODE_NAME,
  MATERIAL_FEED_MODE_NAME,
} from "@/domain/mounter/operationModes"

function makeController(overrides?: {
  isUnloadMode?: ReturnType<typeof ref<boolean>>
  isIpqcMode?: ReturnType<typeof ref<boolean>>
  materialInputEl?: HTMLInputElement | null
  slotInputEl?: HTMLInputElement | null
}) {
  const isUnloadMode = overrides?.isUnloadMode ?? ref(false)
  const isIpqcMode = overrides?.isIpqcMode ?? ref(false)
  const materialInputEl = overrides?.materialInputEl ?? null
  const slotInputEl = overrides?.slotInputEl ?? null

  return useUnloadModeController({
    isUnloadMode,
    isIpqcMode,
    toCanonicalSlot: (raw) => raw || null,
    getUnloadMaterialInputRef: () => materialInputEl,
    getUnloadSlotInputRef: () => slotInputEl,
  })
}

describe("useUnloadModeController", () => {
  describe("operationModeName", () => {
    it("returns force unload name when isUnloadMode=true and modeType=force_single_slot", () => {
      const isUnloadMode = ref(true)
      const ctrl = makeController({ isUnloadMode })
      ctrl.unloadModeType.value = "force_single_slot"
      expect(ctrl.operationModeName.value).toBe(MATERIAL_FORCE_UNLOAD_MODE_NAME)
    })

    it("returns unload name when isUnloadMode=true and modeType=pack_auto_slot", () => {
      const isUnloadMode = ref(true)
      const ctrl = makeController({ isUnloadMode })
      ctrl.unloadModeType.value = "pack_auto_slot"
      expect(ctrl.operationModeName.value).toBe(MATERIAL_UNLOAD_MODE_NAME)
    })

    it("returns IPQC name when isIpqcMode=true (overrides unload=false)", () => {
      const isIpqcMode = ref(true)
      const ctrl = makeController({ isIpqcMode })
      expect(ctrl.operationModeName.value).toBe(MATERIAL_IPQC_MODE_NAME)
    })

    it("returns feed name when both modes are false", () => {
      const ctrl = makeController()
      expect(ctrl.operationModeName.value).toBe(MATERIAL_FEED_MODE_NAME)
    })
  })

  describe("resetUnloadFlowState", () => {
    it("sets phase to force_unload_slot_scan for force_single_slot", () => {
      const ctrl = makeController()
      ctrl.resetUnloadFlowState("force_single_slot")
      expect(ctrl.unloadReplacePhase.value).toBe("force_unload_slot_scan")
      expect(ctrl.unloadModeType.value).toBe("force_single_slot")
    })

    it("sets phase to unload_scan for pack_auto_slot", () => {
      const ctrl = makeController()
      ctrl.unloadReplacePhase.value = "replace_slot_scan"
      ctrl.resetUnloadFlowState("pack_auto_slot")
      expect(ctrl.unloadReplacePhase.value).toBe("unload_scan")
    })

    it("clears all value refs", () => {
      const ctrl = makeController()
      ctrl.unloadMaterialValue.value = "MAT-001"
      ctrl.unloadSlotValue.value = "SLOT-1"
      ctrl.resolvedUnloadSlotIdno.value = "SLOT-1"
      ctrl.replacementMaterialPackCode.value = "MAT-002"

      ctrl.resetUnloadFlowState()

      expect(ctrl.unloadMaterialValue.value).toBe("")
      expect(ctrl.unloadSlotValue.value).toBe("")
      expect(ctrl.resolvedUnloadSlotIdno.value).toBe("")
      expect(ctrl.replacementMaterialPackCode.value).toBe("")
    })
  })

  describe("focusByCurrentPhase", () => {
    it("focuses slot input when phase is force_unload_slot_scan", async () => {
      const materialFocus = vi.fn()
      const slotFocus = vi.fn()
      const materialEl = { focus: materialFocus } as unknown as HTMLInputElement
      const slotEl = { focus: slotFocus } as unknown as HTMLInputElement

      const ctrl = useUnloadModeController({
        isUnloadMode: ref(false),
        isIpqcMode: ref(false),
        toCanonicalSlot: (raw) => raw,
        getUnloadMaterialInputRef: () => materialEl,
        getUnloadSlotInputRef: () => slotEl,
      })

      ctrl.unloadReplacePhase.value = "force_unload_slot_scan"
      ctrl.focusByCurrentPhase()
      await nextTick()

      expect(slotFocus).toHaveBeenCalled()
      expect(materialFocus).not.toHaveBeenCalled()
    })

    it("focuses material input when phase is unload_scan", async () => {
      const materialFocus = vi.fn()
      const slotFocus = vi.fn()
      const materialEl = { focus: materialFocus } as unknown as HTMLInputElement
      const slotEl = { focus: slotFocus } as unknown as HTMLInputElement

      const ctrl = useUnloadModeController({
        isUnloadMode: ref(false),
        isIpqcMode: ref(false),
        toCanonicalSlot: (raw) => raw,
        getUnloadMaterialInputRef: () => materialEl,
        getUnloadSlotInputRef: () => slotEl,
      })

      ctrl.unloadReplacePhase.value = "unload_scan"
      ctrl.focusByCurrentPhase()
      await nextTick()

      expect(materialFocus).toHaveBeenCalled()
      expect(slotFocus).not.toHaveBeenCalled()
    })
  })

  describe("resetToInitialUnloadPhase", () => {
    it("resets to force_unload_slot_scan when modeType is force_single_slot", () => {
      const ctrl = makeController()
      ctrl.unloadModeType.value = "force_single_slot"
      ctrl.unloadReplacePhase.value = "replace_material_scan"
      ctrl.resetToInitialUnloadPhase()
      expect(ctrl.unloadReplacePhase.value).toBe("force_unload_slot_scan")
    })

    it("resets to unload_scan when modeType is pack_auto_slot", () => {
      const ctrl = makeController()
      ctrl.unloadModeType.value = "pack_auto_slot"
      ctrl.unloadReplacePhase.value = "replace_slot_scan"
      ctrl.resetToInitialUnloadPhase()
      expect(ctrl.unloadReplacePhase.value).toBe("unload_scan")
    })
  })

  describe("mode switching", () => {
    it("operationModeName updates reactively when isUnloadMode toggles", () => {
      const isUnloadMode = ref(false)
      const ctrl = makeController({ isUnloadMode })

      expect(ctrl.operationModeName.value).toBe(MATERIAL_FEED_MODE_NAME)

      isUnloadMode.value = true
      expect(ctrl.operationModeName.value).toBe(MATERIAL_UNLOAD_MODE_NAME)

      isUnloadMode.value = false
      expect(ctrl.operationModeName.value).toBe(MATERIAL_FEED_MODE_NAME)
    })

    it("operationModeName updates reactively when isIpqcMode toggles", () => {
      const isIpqcMode = ref(false)
      const ctrl = makeController({ isIpqcMode })

      expect(ctrl.operationModeName.value).toBe(MATERIAL_FEED_MODE_NAME)

      isIpqcMode.value = true
      expect(ctrl.operationModeName.value).toBe(MATERIAL_IPQC_MODE_NAME)

      isIpqcMode.value = false
      expect(ctrl.operationModeName.value).toBe(MATERIAL_FEED_MODE_NAME)
    })

    it("operationModeName updates when switching unloadModeType between pack_auto_slot and force_single_slot", () => {
      const isUnloadMode = ref(true)
      const ctrl = makeController({ isUnloadMode })

      ctrl.unloadModeType.value = "pack_auto_slot"
      expect(ctrl.operationModeName.value).toBe(MATERIAL_UNLOAD_MODE_NAME)

      ctrl.unloadModeType.value = "force_single_slot"
      expect(ctrl.operationModeName.value).toBe(MATERIAL_FORCE_UNLOAD_MODE_NAME)

      ctrl.unloadModeType.value = "pack_auto_slot"
      expect(ctrl.operationModeName.value).toBe(MATERIAL_UNLOAD_MODE_NAME)
    })

    it("isUnloadMode takes priority over isIpqcMode in operationModeName", () => {
      const isUnloadMode = ref(true)
      const isIpqcMode = ref(true)
      const ctrl = makeController({ isUnloadMode, isIpqcMode })

      // unload 優先，IPQC 被壓過
      expect(ctrl.operationModeName.value).toBe(MATERIAL_UNLOAD_MODE_NAME)

      isUnloadMode.value = false
      // 現在只剩 IPQC
      expect(ctrl.operationModeName.value).toBe(MATERIAL_IPQC_MODE_NAME)
    })

    it("phase computed flags update correctly as phase advances through unload flow", () => {
      const ctrl = makeController()

      ctrl.unloadReplacePhase.value = "unload_scan"
      expect(ctrl.isUnloadScanPhase.value).toBe(true)
      expect(ctrl.isForceUnloadSlotPhase.value).toBe(false)
      expect(ctrl.isReplaceMaterialPhase.value).toBe(false)
      expect(ctrl.isReplaceSlotPhase.value).toBe(false)

      ctrl.unloadReplacePhase.value = "force_unload_slot_scan"
      expect(ctrl.isUnloadScanPhase.value).toBe(false)
      expect(ctrl.isForceUnloadSlotPhase.value).toBe(true)

      ctrl.unloadReplacePhase.value = "replace_material_scan"
      expect(ctrl.isReplaceMaterialPhase.value).toBe(true)
      expect(ctrl.isForceUnloadSlotPhase.value).toBe(false)

      ctrl.unloadReplacePhase.value = "replace_slot_scan"
      expect(ctrl.isReplaceSlotPhase.value).toBe(true)
      expect(ctrl.isReplaceMaterialPhase.value).toBe(false)
    })

    it("isUnloadMaterialInputDisabled toggles correctly across phases", () => {
      const ctrl = makeController()

      ctrl.unloadReplacePhase.value = "unload_scan"
      expect(ctrl.isUnloadMaterialInputDisabled.value).toBe(false)

      ctrl.unloadReplacePhase.value = "force_unload_slot_scan"
      expect(ctrl.isUnloadMaterialInputDisabled.value).toBe(true)

      ctrl.unloadReplacePhase.value = "replace_material_scan"
      expect(ctrl.isUnloadMaterialInputDisabled.value).toBe(false)

      ctrl.unloadReplacePhase.value = "replace_slot_scan"
      expect(ctrl.isUnloadMaterialInputDisabled.value).toBe(true)
    })

    it("isUnloadSlotInputDisabled toggles correctly across phases", () => {
      const ctrl = makeController()

      ctrl.unloadReplacePhase.value = "unload_scan"
      expect(ctrl.isUnloadSlotInputDisabled.value).toBe(true)

      ctrl.unloadReplacePhase.value = "force_unload_slot_scan"
      expect(ctrl.isUnloadSlotInputDisabled.value).toBe(false)

      ctrl.unloadReplacePhase.value = "replace_material_scan"
      expect(ctrl.isUnloadSlotInputDisabled.value).toBe(true)

      // replace_slot_scan：有 replacementMaterialPackCode 才能啟用
      ctrl.unloadReplacePhase.value = "replace_slot_scan"
      ctrl.replacementMaterialPackCode.value = ""
      expect(ctrl.isUnloadSlotInputDisabled.value).toBe(true)

      ctrl.replacementMaterialPackCode.value = "MAT-001"
      expect(ctrl.isUnloadSlotInputDisabled.value).toBe(false)
    })

    it("unloadSlotPlaceholder updates when resolvedUnloadSlotIdno changes", () => {
      const ctrl = makeController()
      ctrl.unloadReplacePhase.value = "replace_slot_scan"

      ctrl.resolvedUnloadSlotIdno.value = ""
      expect(ctrl.unloadSlotPlaceholder.value).toBe("請掃描原卸料站位 ")

      ctrl.resolvedUnloadSlotIdno.value = "25-A"
      expect(ctrl.unloadSlotPlaceholder.value).toBe("請掃描原卸料站位 25-A")
    })
  })
})
