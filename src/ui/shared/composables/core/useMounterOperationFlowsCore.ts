import { computed } from "vue"
import {
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
import { createScanDispatcher } from "./flows/scanDispatcher"

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

  // ── Scan dispatcher ───────────────────────────────────────────────────────

  const {
    handleModeTriggerFromNormalInput,
    handleBeforeMaterialScan,
    handleBeforeSlotSubmit,
    handleSpliceMaterialEnter,
    handleSpliceSlotEnter,
  } = createScanDispatcher({
    isIpqcMode, isUnloadMode, isSpliceMode,
    isSpliceIdlePhase, isSpliceNewPhase, isSpliceSlotPhase,
    spliceMaterialValue, spliceSlotValue,
    handleUserSwitchTrigger, isBarcodeAlreadyInGrid, showError, focusSpliceMaterialInput,
    enterIpqcMode, exitIpqcMode,
    enterUnloadMode, exitUnloadMode,
    enterSpliceMode,
    handleModeTriggerFromSpliceInput,
    handleSpliceCurrentScan, handleSpliceNewScan, handleSpliceSlotSubmit,
  })

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
