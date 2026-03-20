import type { Ref } from 'vue'
import { computed, nextTick, ref } from 'vue'
import {
  MATERIAL_UNLOAD_MODE_NAME,
  MATERIAL_FORCE_UNLOAD_MODE_NAME,
  MATERIAL_FEED_MODE_NAME,
  MATERIAL_IPQC_MODE_NAME,
} from '@/domain/mounter/operationModes'

export type UnloadModeType = "pack_auto_slot" | "force_single_slot"
export type UnloadReplacePhase =
  | "unload_scan"
  | "force_unload_slot_scan"
  | "replace_material_scan"
  | "replace_slot_scan"

export type UnloadModeControllerOptions = {
  isUnloadMode: Ref<boolean>
  isIpqcMode: Ref<boolean>
  toCanonicalSlot: (raw: string) => string | null
  getUnloadMaterialInputRef: () => HTMLInputElement | null
  getUnloadSlotInputRef: () => HTMLInputElement | null
}

export function useUnloadModeController(options: UnloadModeControllerOptions) {
  const unloadModeType = ref<UnloadModeType>("pack_auto_slot")
  const unloadReplacePhase = ref<UnloadReplacePhase>("unload_scan")
  const unloadMaterialValue = ref("")
  const unloadSlotValue = ref("")
  const resolvedUnloadSlotIdno = ref("")
  const replacementMaterialPackCode = ref("")

  const isUnloadScanPhase = computed(() => unloadReplacePhase.value === "unload_scan")
  const isForceUnloadSlotPhase = computed(
    () => unloadReplacePhase.value === "force_unload_slot_scan"
  )
  const isReplaceMaterialPhase = computed(
    () => unloadReplacePhase.value === "replace_material_scan"
  )
  const isReplaceSlotPhase = computed(() => unloadReplacePhase.value === "replace_slot_scan")

  const operationModeName = computed(() => {
    if (options.isUnloadMode.value) {
      return unloadModeType.value === "force_single_slot"
        ? MATERIAL_FORCE_UNLOAD_MODE_NAME
        : MATERIAL_UNLOAD_MODE_NAME
    }
    if (options.isIpqcMode.value) return MATERIAL_IPQC_MODE_NAME
    return MATERIAL_FEED_MODE_NAME
  })

  const unloadMaterialLabel = computed(() => {
    if (isUnloadScanPhase.value) return "卸除捲號（自動定位）"
    if (isReplaceMaterialPhase.value) return "更換捲號"
    return "更換捲號（待掃站位）"
  })

  const unloadMaterialPlaceholder = computed(() => {
    if (isUnloadScanPhase.value) return "請掃描要卸除的捲號"
    if (isForceUnloadSlotPhase.value) return "請先掃描站位進行強制卸除"
    if (isReplaceMaterialPhase.value) return "請掃描要更換的捲號"
    return replacementMaterialPackCode.value
  })

  const hasUnloadMaterial = computed(() => {
    if (isReplaceSlotPhase.value) return replacementMaterialPackCode.value.trim().length > 0
    return unloadMaterialValue.value.trim().length > 0
  })

  const isUnloadMaterialInputDisabled = computed(
    () => isReplaceSlotPhase.value || isForceUnloadSlotPhase.value
  )

  const isUnloadSlotInputDisabled = computed(() => {
    if (isForceUnloadSlotPhase.value) return false
    if (isReplaceSlotPhase.value) return !hasUnloadMaterial.value
    return true
  })

  const unloadSlotLabel = computed(() =>
    isForceUnloadSlotPhase.value ? "卸除站位" : "站位編號"
  )

  const unloadSlotPlaceholder = computed(() => {
    if (isForceUnloadSlotPhase.value) return "請掃描要卸除的站位"
    if (isReplaceSlotPhase.value) return `請掃描原卸料站位 ${resolvedUnloadSlotIdno.value || ""}`
    return "請先掃描更換捲號"
  })

  function resetUnloadFlowState(modeType: UnloadModeType = unloadModeType.value) {
    unloadModeType.value = modeType
    unloadReplacePhase.value =
      modeType === "force_single_slot" ? "force_unload_slot_scan" : "unload_scan"
    unloadMaterialValue.value = ""
    unloadSlotValue.value = ""
    resolvedUnloadSlotIdno.value = ""
    replacementMaterialPackCode.value = ""
  }

  function focusUnloadMaterialInput() {
    nextTick(() => {
      options.getUnloadMaterialInputRef()?.focus()
    })
  }

  function focusUnloadSlotInput() {
    nextTick(() => {
      options.getUnloadSlotInputRef()?.focus()
    })
  }

  function focusByCurrentPhase() {
    if (isForceUnloadSlotPhase.value || isReplaceSlotPhase.value) {
      focusUnloadSlotInput()
      return
    }
    focusUnloadMaterialInput()
  }

  function resetToInitialUnloadPhase() {
    unloadReplacePhase.value =
      unloadModeType.value === "force_single_slot"
        ? "force_unload_slot_scan"
        : "unload_scan"
  }

  return {
    unloadModeType,
    unloadReplacePhase,
    unloadMaterialValue,
    unloadSlotValue,
    resolvedUnloadSlotIdno,
    replacementMaterialPackCode,
    operationModeName,
    isUnloadScanPhase,
    isForceUnloadSlotPhase,
    isReplaceMaterialPhase,
    isReplaceSlotPhase,
    unloadMaterialLabel,
    unloadMaterialPlaceholder,
    hasUnloadMaterial,
    isUnloadMaterialInputDisabled,
    isUnloadSlotInputDisabled,
    unloadSlotLabel,
    unloadSlotPlaceholder,
    resetUnloadFlowState,
    focusUnloadMaterialInput,
    focusUnloadSlotInput,
    focusByCurrentPhase,
    resetToInitialUnloadPhase,
  }
}
