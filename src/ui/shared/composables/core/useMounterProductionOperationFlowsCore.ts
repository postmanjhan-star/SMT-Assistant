import { computed, nextTick, ref } from "vue"
import type { ComputedRef, Ref } from "vue"
import {
  MATERIAL_UNLOAD_MODE_NAME,
  MATERIAL_FORCE_UNLOAD_MODE_NAME,
  MATERIAL_IPQC_MODE_NAME,
  MATERIAL_LOAD_MODE_NAME,
  MATERIAL_SPLICE_MODE_NAME,
} from "@/domain/mounter/operationModes"
import { useOperationModeStateMachine } from "@/ui/shared/composables/useOperationModeStateMachine"
import type { MounterProductionOperationFlowsAdapter } from "./MounterProductionOperationFlowsAdapter"
import type { OperationFlowRow } from "./MounterOperationFlowsAdapter"
import { createProductionScanDispatcher } from "./flows/production/productionScanDispatcher"
import { createProductionSpliceCoordinator } from "./flows/production/productionSpliceCoordinator"
import { createProductionIpqcCoordinator } from "./flows/production/productionIpqcCoordinator"
import { createProductionUnloadCoordinator } from "./flows/production/productionUnloadCoordinator"

// ─────────────────────────────────────────────────────────────────────────────
// correct state 常數（生產模式對應後端 CheckMaterialMatchEnum 字串值）
// ─────────────────────────────────────────────────────────────────────────────

const PRODUCTION_CORRECT = {
  MATCHED:  "MATCHED_MATERIAL_PACK",
  UNLOADED: "UNLOADED_MATERIAL_PACK",  // IPQC 模式暫時設定值
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Options
// ─────────────────────────────────────────────────────────────────────────────

export type MounterProductionFlowsCoreOptions<TRow extends OperationFlowRow = OperationFlowRow> = {
  rowData: Ref<TRow[]>
  currentUsername: ComputedRef<string | null>
  isTestingMode: Ref<boolean>
  isMockMode: boolean
  showError: (msg: string) => void
  showSuccess: (msg: string) => void
  handleUserSwitchTrigger: (code: string) => boolean
  clearNormalScanState: () => void
  focusMaterialInput: () => void
  // ERP 查詢（供 IPQC 使用，throws on error）
  fetchMaterialInventory: (code: string) => Promise<unknown>
  // 即時 API（從 workflow/page 層注入）
  submitUnload(params: { materialPackCode: string; slotIdno: string }): Promise<boolean>
  submitForceUnloadBySlot(params: { slotIdno: string; unfeedReason?: string | null }): Promise<{ ok: boolean; slotIdno?: string }>
  findUniqueUnloadSlotByPackCode(code: string): { ok: true; slotIdno: string } | { ok: false; error: string }
  validateUnloadMaterialPackCode(code: string): Promise<boolean>
  validateReplacementMaterialForSlot(params: { materialPackCode: string; slotIdno: string }): Promise<boolean>
  submitReplace(params: { materialPackCode: string; slotIdno: string }): Promise<boolean>
  submitSplice(params: { materialPackCode: string; slotIdno: string }): Promise<boolean>
}

// ─────────────────────────────────────────────────────────────────────────────
// Core Composable
// ─────────────────────────────────────────────────────────────────────────────

export function useMounterProductionOperationFlowsCore<TRow extends OperationFlowRow = OperationFlowRow>(
  options: MounterProductionFlowsCoreOptions<TRow>,
  adapter: MounterProductionOperationFlowsAdapter<TRow>,
) {
  const {
    rowData, currentUsername, isTestingMode, isMockMode,
    showError, showSuccess, handleUserSwitchTrigger,
    clearNormalScanState, focusMaterialInput,
  } = options

  // ── State machine ──────────────────────────────────────────────────────────

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

  // ── Input values（v-model） ────────────────────────────────────────────────

  const unloadMaterialValue  = ref("")
  const unloadSlotValue      = ref("")
  const ipqcMaterialValue    = ref("")
  const ipqcSlotValue        = ref("")
  const spliceMaterialValue  = ref("")
  const spliceSlotValue      = ref("")

  // ── Input DOM refs（:ref binding） ─────────────────────────────────────────

  const unloadMaterialInput = ref<HTMLInputElement | null>(null)
  const unloadSlotInput     = ref<HTMLInputElement | null>(null)
  const ipqcMaterialInput   = ref<HTMLInputElement | null>(null)
  const ipqcSlotInput       = ref<HTMLInputElement | null>(null)
  const spliceMaterialInput = ref<HTMLInputElement | null>(null)
  const spliceSlotInput     = ref<HTMLInputElement | null>(null)

  const spliceSavedCorrectState = ref<{ rowKey: string; correct: string | null | undefined } | null>(null)

  // ── UI helper computeds ────────────────────────────────────────────────────

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

  // ── Grid helpers ───────────────────────────────────────────────────────────

  function updateRowInGrid(row: TRow) {
    try { adapter.applyGridTransaction([row]) } catch { /* grid not ready */ }
  }

  function bulkUpdateGrid() {
    try { adapter.applyGridTransaction(rowData.value) } catch { /* grid not ready */ }
  }

  // ── Row search helpers ─────────────────────────────────────────────────────

  function findRowBySlotIdno(slotIdno: string): TRow | null {
    return adapter.findRowBySlotInput(slotIdno, rowData.value)
  }

  function getLoadedPackCode(row: TRow): string {
    const appended = String(row.appendedMaterialInventoryIdno ?? "").trim()
    if (appended) return appended
    if (!isIpqcMode.value && row.correct === PRODUCTION_CORRECT.UNLOADED) return ""
    return String(row.materialInventoryIdno ?? "").trim()
  }

  function getSplicePackCode(row: TRow): string {
    return String(row.spliceMaterialInventoryIdno ?? "").trim()
  }

  function getCurrentPackCode(row: TRow): string {
    return getSplicePackCode(row) || getLoadedPackCode(row)
  }

  // ── Duplicate detection ────────────────────────────────────────────────────

  function isBarcodeAlreadyInGrid(barcode: string): boolean {
    return rowData.value.some((row) => {
      if (getLoadedPackCode(row) === barcode) return true
      return getSplicePackCode(row) === barcode
    })
  }

  // ── Coordinators ───────────────────────────────────────────────────────────

  const unloadCoordinator = createProductionUnloadCoordinator<TRow>({
    machine,
    adapter,
    isMockMode,
    showError,
    clearNormalScanState,
    focusMaterialInput,
    unloadMaterialValue,
    unloadSlotValue,
    unloadMaterialInput,
    unloadSlotInput,
    submitUnload: options.submitUnload,
    submitForceUnloadBySlot: options.submitForceUnloadBySlot,
    findUniqueUnloadSlotByPackCode: options.findUniqueUnloadSlotByPackCode,
    validateReplacementMaterialForSlot: options.validateReplacementMaterialForSlot,
    submitReplace: options.submitReplace,
  })
  const {
    focusUnloadMaterialInput,
    focusUnloadSlotInput,
    focusByCurrentPhase,
    enterUnloadMode,
    exitUnloadMode,
    handleUnloadMaterialSubmit,
    handleForceUnloadSlotSubmit,
    handleReplacementMaterialSubmit,
    handleReplaceSlotSubmit,
  } = unloadCoordinator

  const spliceCoordinator = createProductionSpliceCoordinator<TRow>({
    machine,
    rowData,
    adapter,
    isMockMode,
    showError,
    clearNormalScanState,
    focusMaterialInput,
    spliceMaterialValue,
    spliceSlotValue,
    spliceMaterialInput,
    spliceSlotInput,
    spliceSavedCorrectState,
    findRowBySlotIdno,
    updateRowInGrid,
    findUniqueUnloadSlotByPackCode: options.findUniqueUnloadSlotByPackCode,
    validateUnloadMaterialPackCode: options.validateUnloadMaterialPackCode,
    validateReplacementMaterialForSlot: options.validateReplacementMaterialForSlot,
    submitSplice: options.submitSplice,
  })
  const {
    focusSpliceMaterialInput,
    focusSpliceSlotInput,
    enterSpliceMode,
    exitSpliceMode,
    handleSpliceCurrentScan,
    handleSpliceNewScan,
    handleSpliceSlotSubmit,
  } = spliceCoordinator

  const ipqcCoordinator = createProductionIpqcCoordinator<TRow>({
    machine,
    rowData,
    adapter,
    isMockMode,
    isTestingMode,
    currentUsername,
    showError,
    showSuccess,
    clearNormalScanState,
    focusMaterialInput,
    handleUserSwitchTrigger,
    ipqcMaterialValue,
    ipqcSlotValue,
    ipqcMaterialInput,
    ipqcSlotInput,
    findRowBySlotIdno,
    getCurrentPackCode,
    updateRowInGrid,
    bulkUpdateGrid,
    enterUnloadMode,
    enterSpliceMode,
    fetchMaterialInventory: options.fetchMaterialInventory,
  })
  const {
    enterIpqcMode,
    exitIpqcMode,
    toggleIpqcMode,
    handleIpqcMaterialSubmit,
    handleIpqcSlotSubmit,
  } = ipqcCoordinator

  // ── Mode trigger dispatch ──────────────────────────────────────────────────

  const {
    handleModeTriggerFromNormalInput,
    handleModeTriggerFromUnloadInput,
    handleModeTriggerFromSpliceInput,
  } = createProductionScanDispatcher({
    isIpqcMode, isUnloadMode, unloadModeType,
    handleUserSwitchTrigger,
    enterUnloadMode, exitUnloadMode,
    enterIpqcMode, exitIpqcMode, toggleIpqcMode,
    enterSpliceMode, exitSpliceMode,
  })

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

  function handleBeforeMaterialScan(barcode: string): boolean {
    const code = barcode.trim().toUpperCase()

    if (isSpliceMode.value && isSpliceIdlePhase.value) {
      if (handleModeTriggerFromSpliceInput(code)) return false
      if (!isBarcodeAlreadyInGrid(barcode.trim())) {
        showError("請先掃描已上料的捲號進行接料")
        focusSpliceMaterialInput()
        return false
      }
      void handleSpliceCurrentScan(barcode.trim())
      return false
    }
    if (isSpliceMode.value && isSpliceNewPhase.value) {
      if (handleModeTriggerFromSpliceInput(code)) return false
      void handleSpliceNewScan(barcode.trim())
      return false
    }

    if (handleModeTriggerFromNormalInput(code)) return false
    if (!isIpqcMode.value && isBarcodeAlreadyInGrid(barcode.trim())) {
      showError("重複掃描：此條碼已存在於目前站位資料")
      return false
    }
    return true
  }

  function handleBeforeSlotSubmit(raw: string): boolean {
    const normalized = raw.trim().toUpperCase()
    if (isSpliceMode.value) {
      if (handleModeTriggerFromSpliceInput(normalized)) return false
      if (isSpliceSlotPhase.value) {
        void handleSpliceSlotSubmit(raw.trim())
        return false
      }
      return false
    }
    if (handleModeTriggerFromNormalInput(normalized)) return false
    const row = findRowBySlotIdno(raw.trim())
    if (row && (getLoadedPackCode(row) || getSplicePackCode(row))) {
      showError(`站位 ${raw.trim()} 已有上料條碼，若要接料請先輸入 S5566`)
      return false
    }
    return true
  }

  // ── Unload entry handlers (thin wrappers using scan dispatcher) ────────────

  function handleUnloadMaterialEnter() {
    const material = unloadMaterialValue.value.trim()
    unloadMaterialValue.value = material
    if (!material) return

    if (handleModeTriggerFromUnloadInput(material.toUpperCase())) return

    if (isUnloadScanPhase.value)      { void handleUnloadMaterialSubmit(material); return }
    if (isReplaceMaterialPhase.value) { void handleReplacementMaterialSubmit(material) }
  }

  async function handleUnloadSlotSubmit() {
    if (!isUnloadMode.value) return

    const slotIdno = unloadSlotValue.value.trim()
    if (!slotIdno) {
      showError("請輸入站位")
      focusUnloadSlotInput()
      return
    }

    if (handleModeTriggerFromUnloadInput(slotIdno.toUpperCase())) return

    if (isForceUnloadSlotPhase.value) {
      void handleForceUnloadSlotSubmit(slotIdno)
      return
    }

    if (!isReplaceSlotPhase.value) {
      focusUnloadSlotInput()
      return
    }

    await handleReplaceSlotSubmit(slotIdno)
  }

  // ── Return ─────────────────────────────────────────────────────────────────

  return {
    // Machine state
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
    spliceSlotIdno,
    spliceNewPackCode,
    unloadModeType,
    resolvedUnloadSlotIdno,
    replacementMaterialPackCode,
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
    toggleIpqcMode,
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
    // Helpers exposed for .vue
    findRowBySlotIdno,
  }
}

export type MounterProductionOperationFlowsCore = ReturnType<typeof useMounterProductionOperationFlowsCore>
