import { computed } from "vue"
import {
  MATERIAL_SPLICE_TRIGGER,
  MATERIAL_FORCE_UNLOAD_TRIGGER,
  MATERIAL_IPQC_TRIGGER,
  MATERIAL_UNLOAD_TRIGGER,
  MATERIAL_UNLOAD_MODE_NAME,
  MATERIAL_FORCE_UNLOAD_MODE_NAME,
  MATERIAL_IPQC_MODE_NAME,
  MATERIAL_LOAD_MODE_NAME,
  MATERIAL_SPLICE_MODE_NAME,
} from "@/domain/mounter/operationModes"
import { useOperationModeStateMachine } from "@/ui/shared/composables/useOperationModeStateMachine"
import type { MounterOperationFlowsAdapter, MounterOperationFlowsCoreOptions } from "./MounterOperationFlowsAdapter"
import { CORRECT_STATE, createMaterialPackCodeHelpers } from "./flows/materialPackCodeHelpers"
import { createMaterialValidator } from "./flows/materialValidator"
import { createIpqcCoordinator } from "./flows/ipqcCoordinator"
import { createSpliceCoordinator } from "./flows/spliceCoordinator"
import { createUnloadReplaceCoordinator } from "./flows/unloadReplaceCoordinator"

export { CORRECT_STATE }

// ─────────────────────────────────────────────────────────────────────────────
// Core Composable
// ─────────────────────────────────────────────────────────────────────────────

export function useMounterOperationFlowsCore(
  options: MounterOperationFlowsCoreOptions,
  adapter: MounterOperationFlowsAdapter,
) {
  const {
    rowData, currentUsername, isTestingMode, isMockMode,
    fetchMaterialInventory, showError, handleUserSwitchTrigger,
    clearNormalScanState, focusMaterialInput, persistNow,
    pendingUnloadRecords, pendingSpliceRecords, pendingIpqcRecords,
  } = options

  // ── State machine ─────────────────────────────────────────────────────────

  const machine = useOperationModeStateMachine()

  const {
    isUnloadMode,
    isIpqcMode,
    isSpliceMode,
    isUnloadScanPhase,
    isForceUnloadSlotPhase,
    isReplaceMaterialPhase,
    isReplaceSlotPhase,
    isSpliceIdlePhase,
    isSpliceNewPhase,
    isSpliceSlotPhase,
    unloadModeType,
    resolvedUnloadSlotIdno,
    replacementMaterialPackCode,
    spliceSlotIdno,
    spliceNewPackCode,
  } = machine

  // ── Material pack code helpers ────────────────────────────────────────────

  const {
    getLoadedPackCode,
    getSplicePackCode,
    getCurrentPackCode,
    getForceUnloadPackCode,
    isBarcodeAlreadyInGrid,
    findUniqueUnloadSlotByPackCode,
  } = createMaterialPackCodeHelpers({
    isIpqcMode,
    rowData,
    toRowSlotIdno: adapter.toRowSlotIdno,
  })

  // ── Operation mode name (top-level UI computed) ──────────────────────────

  const operationModeName = computed(() => {
    if (isUnloadMode.value) {
      return unloadModeType.value === "force_single_slot"
        ? MATERIAL_FORCE_UNLOAD_MODE_NAME
        : MATERIAL_UNLOAD_MODE_NAME
    }
    if (isIpqcMode.value)   return MATERIAL_IPQC_MODE_NAME
    if (isSpliceMode.value) return MATERIAL_SPLICE_MODE_NAME
    return MATERIAL_LOAD_MODE_NAME
  })

  // ── Grid helpers ──────────────────────────────────────────────────────────

  function updateRowInGrid(row: any) {
    try {
      adapter.applyGridTransaction([row])
    } catch {
      // Grid might not be ready
    }
  }

  // ── Row search helpers ────────────────────────────────────────────────────

  function findRowBySlotIdno(slotIdno: string): any | null {
    return adapter.findRowBySlotInput(slotIdno, rowData.value)
  }

  // ── Validation ────────────────────────────────────────────────────────────

  const {
    resolveExistenceBasedCorrectState,
    validateUnloadMaterialPackCode,
    resolveReplacementCorrectState,
  } = createMaterialValidator({
    isTestingMode,
    isMockMode,
    fetchMaterialInventory,
    showError,
    findRowBySlotIdno,
  })

  // ── Unload-replace coordinator ───────────────────────────────────────────

  const unloadCoord = createUnloadReplaceCoordinator({
    machine,
    adapter,
    rowData,
    currentUsername,
    pendingUnloadRecords,
    pendingSpliceRecords,
    isUnloadMode,
    isUnloadScanPhase,
    isForceUnloadSlotPhase,
    isReplaceMaterialPhase,
    isReplaceSlotPhase,
    unloadModeType,
    resolvedUnloadSlotIdno,
    replacementMaterialPackCode,
    getLoadedPackCode,
    getSplicePackCode,
    getForceUnloadPackCode,
    findUniqueUnloadSlotByPackCode,
    resolveReplacementCorrectState,
    findRowBySlotIdno,
    updateRowInGrid,
    showError,
    clearNormalScanState,
    focusMaterialInput,
    persistNow,
    enterIpqcMode: () => enterIpqcMode(),
    enterSpliceMode: () => enterSpliceMode(),
  })

  const {
    unloadMaterialValue,
    unloadSlotValue,
    unloadMaterialInput,
    unloadSlotInput,
    unloadMaterialLabel,
    unloadMaterialPlaceholder,
    hasUnloadMaterial,
    isUnloadMaterialInputDisabled,
    isUnloadSlotInputDisabled,
    unloadSlotLabel,
    unloadSlotPlaceholder,
    focusByCurrentPhase,
    enterUnloadMode,
    exitUnloadMode,
    handleUnloadMaterialEnter,
    handleUnloadSlotSubmit,
    onUnloadUploaded,
  } = unloadCoord

  // ── IPQC coordinator ──────────────────────────────────────────────────────

  const ipqc = createIpqcCoordinator({
    machine,
    adapter,
    rowData,
    currentUsername,
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
    enterSpliceMode: () => enterSpliceMode(),
    enterUnloadMode: (type) => enterUnloadMode(type),
  })

  const {
    ipqcMaterialValue,
    ipqcSlotValue,
    ipqcMaterialInput,
    ipqcSlotInput,
    enterIpqcMode,
    exitIpqcMode,
    handleIpqcMaterialSubmit,
    handleIpqcSlotSubmit,
    onIpqcUploaded,
  } = ipqc

  // ── Splice coordinator ───────────────────────────────────────────────────

  const splice = createSpliceCoordinator({
    machine,
    adapter,
    rowData,
    currentUsername,
    pendingSpliceRecords,
    spliceSlotIdno,
    spliceNewPackCode,
    findUniqueUnloadSlotByPackCode,
    validateUnloadMaterialPackCode,
    resolveReplacementCorrectState,
    findRowBySlotIdno,
    updateRowInGrid,
    showError,
    clearNormalScanState,
    focusMaterialInput,
    persistNow,
    handleUserSwitchTrigger,
    enterIpqcMode: () => enterIpqcMode(),
    enterUnloadMode: (type) => enterUnloadMode(type),
  })

  const {
    spliceMaterialValue,
    spliceSlotValue,
    spliceMaterialInput,
    spliceSlotInput,
    focusSpliceMaterialInput,
    enterSpliceMode,
    exitSpliceMode,
    handleModeTriggerFromSpliceInput,
    handleSpliceCurrentScan,
    handleSpliceNewScan,
    handleSpliceSlotSubmit,
  } = splice

  // ── Mode transition dispatch ──────────────────────────────────────────────

  function handleModeTriggerFromNormalInput(code: string): boolean {
    if (handleUserSwitchTrigger(code)) return true
    if (code === MATERIAL_UNLOAD_TRIGGER) {
      if (isIpqcMode.value) exitIpqcMode()
      enterUnloadMode("pack_auto_slot")
      return true
    }
    if (code === MATERIAL_FORCE_UNLOAD_TRIGGER) {
      if (isIpqcMode.value) exitIpqcMode()
      enterUnloadMode("force_single_slot")
      return true
    }
    if (code === MATERIAL_IPQC_TRIGGER) {
      isIpqcMode.value ? exitIpqcMode() : enterIpqcMode()
      return true
    }
    if (code === MATERIAL_SPLICE_TRIGGER) {
      if (isIpqcMode.value) exitIpqcMode()
      if (isUnloadMode.value) exitUnloadMode()
      enterSpliceMode()
      return true
    }
    return false
  }

  async function handleBeforeMaterialScan(barcode: string) {
    const normalized = barcode.trim().toUpperCase()

    // 接料模式 IDLE：只接受已存在捲號（舊料）
    if (isSpliceMode.value && isSpliceIdlePhase.value) {
      if (handleModeTriggerFromSpliceInput(normalized)) return false
      if (!isBarcodeAlreadyInGrid(normalized)) {
        showError("請先掃描已上料的捲號進行接料")
        focusSpliceMaterialInput()
        return false
      }
      void handleSpliceCurrentScan(normalized)
      return false
    }
    // 接料模式 NEW_SCAN：接受新捲號
    if (isSpliceMode.value && isSpliceNewPhase.value) {
      if (handleModeTriggerFromSpliceInput(normalized)) return false
      void handleSpliceNewScan(normalized)
      return false
    }

    if (handleModeTriggerFromNormalInput(normalized)) return false
    if (!isIpqcMode.value && isBarcodeAlreadyInGrid(normalized)) {
      showError("重複掃描：此條碼已存在於目前站位資料")
      return false
    }
    return true
  }

  function handleSpliceMaterialEnter() {
    const barcode = spliceMaterialValue.value.trim()
    spliceMaterialValue.value = ""
    if (!barcode) return
    void handleBeforeMaterialScan(barcode)
  }

  function handleSpliceSlotEnter() {
    const slotIdno = spliceSlotValue.value.trim()
    spliceSlotValue.value = ""
    if (!slotIdno) return
    void handleBeforeSlotSubmit(slotIdno)
  }

  async function handleBeforeSlotSubmit(raw: string) {
    const normalized = raw.trim().toUpperCase()
    if (isSpliceMode.value) {
      if (handleModeTriggerFromSpliceInput(normalized)) return false
      if (isSpliceSlotPhase.value) {
        void handleSpliceSlotSubmit(raw.trim())
        return false
      }
      return false
    }
    return !handleModeTriggerFromNormalInput(normalized)
  }

  // ── Return ────────────────────────────────────────────────────────────────

  return {
    // Mode state
    isUnloadMode,
    isIpqcMode,
    isSpliceMode,
    unloadModeType,
    // Phase state
    isUnloadScanPhase,
    isForceUnloadSlotPhase,
    isReplaceMaterialPhase,
    isReplaceSlotPhase,
    // Splice phase state
    isSpliceIdlePhase,
    isSpliceNewPhase,
    isSpliceSlotPhase,
    spliceSlotIdno,
    spliceNewPackCode,
    // UI computeds
    operationModeName,
    unloadMaterialLabel,
    unloadMaterialPlaceholder,
    hasUnloadMaterial,
    isUnloadMaterialInputDisabled,
    isUnloadSlotInputDisabled,
    unloadSlotLabel,
    unloadSlotPlaceholder,
    focusByCurrentPhase,
    // Input values
    unloadMaterialValue,
    unloadSlotValue,
    ipqcMaterialValue,
    ipqcSlotValue,
    spliceMaterialValue,
    spliceSlotValue,
    // Input DOM refs
    unloadMaterialInput,
    unloadSlotInput,
    ipqcMaterialInput,
    ipqcSlotInput,
    spliceMaterialInput,
    spliceSlotInput,
    // Mode control
    enterUnloadMode,
    exitUnloadMode,
    enterIpqcMode,
    exitIpqcMode,
    enterSpliceMode,
    exitSpliceMode,
    // Handlers
    handleBeforeMaterialScan,
    handleBeforeSlotSubmit,
    handleUnloadMaterialEnter,
    handleUnloadSlotSubmit,
    handleIpqcMaterialSubmit,
    handleIpqcSlotSubmit,
    handleSpliceMaterialEnter,
    handleSpliceSlotEnter,
    handleModeTriggerFromNormalInput,
    handleModeTriggerFromSpliceInput,
    // Upload callbacks
    onUnloadUploaded,
    onIpqcUploaded,
    // Helpers exposed for .vue
    findRowBySlotIdno,
    updateRowInGrid,
  }
}

export type MounterOperationFlowsCore = ReturnType<typeof useMounterOperationFlowsCore>
