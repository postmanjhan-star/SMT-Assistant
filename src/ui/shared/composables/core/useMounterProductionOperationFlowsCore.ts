import { computed, nextTick, ref } from "vue"
import type { ComputedRef, Ref } from "vue"
import {
  MATERIAL_UNLOAD_TRIGGER,
  MATERIAL_FORCE_UNLOAD_TRIGGER,
  MATERIAL_EXIT_TRIGGER,
  MATERIAL_IPQC_TRIGGER,
  USER_SWITCH_TRIGGER,
  MATERIAL_UNLOAD_MODE_NAME,
  MATERIAL_FORCE_UNLOAD_MODE_NAME,
  MATERIAL_IPQC_MODE_NAME,
  MATERIAL_FEED_MODE_NAME,
} from "@/domain/mounter/operationModes"
import { useOperationModeStateMachine } from "@/ui/shared/composables/useOperationModeStateMachine"
import { msg } from "@/ui/shared/messageCatalog"
import type { MounterProductionOperationFlowsAdapter } from "./MounterProductionOperationFlowsAdapter"

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

export type MounterProductionFlowsCoreOptions = {
  rowData: Ref<any[]>
  currentUsername: ComputedRef<string | null>
  isTestingMode: Ref<boolean>
  isMockMode: boolean
  showError: (msg: string) => void
  showSuccess: (msg: string) => void
  handleUserSwitchTrigger: (code: string) => boolean
  clearNormalScanState: () => void
  focusMaterialInput: () => void
  // 即時 API（從 workflow/page 層注入）
  submitUnload(params: { materialPackCode: string; slotIdno: string }): Promise<boolean>
  submitForceUnloadBySlot(params: { slotIdno: string; unfeedReason?: string | null }): Promise<{ ok: boolean; slotIdno?: string }>
  findUniqueUnloadSlotByPackCode(code: string): { ok: true; slotIdno: string } | { ok: false; error: string }
  validateUnloadMaterialPackCode(code: string): Promise<boolean>
  validateReplacementMaterialForSlot(params: { materialPackCode: string; slotIdno: string }): Promise<boolean>
  submitReplace(params: { materialPackCode: string; slotIdno: string }): Promise<boolean>
  /**
   * IPQC 物料驗證（可選）。若未提供，複用 validateUnloadMaterialPackCode。
   * Panasonic 需要在 testing mode 下仍驗證 ERP，故注入不同實作；
   * Fuji 直接複用 validateUnloadMaterialPackCode（testing mode 跳過驗證）。
   */
  validateIpqcMaterialPackCode?: (code: string) => Promise<boolean>
}

// ─────────────────────────────────────────────────────────────────────────────
// Core Composable
// ─────────────────────────────────────────────────────────────────────────────

export function useMounterProductionOperationFlowsCore(
  options: MounterProductionFlowsCoreOptions,
  adapter: MounterProductionOperationFlowsAdapter,
) {
  const {
    rowData, currentUsername, isTestingMode, isMockMode,
    showError, showSuccess, handleUserSwitchTrigger,
    clearNormalScanState, focusMaterialInput,
  } = options

  const doIpqcValidation = options.validateIpqcMaterialPackCode ?? options.validateUnloadMaterialPackCode

  // ── State machine ──────────────────────────────────────────────────────────

  const machine = useOperationModeStateMachine()

  const {
    isUnloadMode,
    isIpqcMode,
    isUnloadScanPhase,
    isForceUnloadSlotPhase,
    isReplaceMaterialPhase,
    isReplaceSlotPhase,
    unloadModeType,
    resolvedUnloadSlotIdno,
    replacementMaterialPackCode,
  } = machine

  // ── Input values（v-model） ────────────────────────────────────────────────

  const unloadMaterialValue = ref("")
  const unloadSlotValue     = ref("")
  const ipqcMaterialValue   = ref("")
  const ipqcSlotValue       = ref("")

  // ── Input DOM refs（:ref binding） ─────────────────────────────────────────

  const unloadMaterialInput = ref<HTMLInputElement | null>(null)
  const unloadSlotInput     = ref<HTMLInputElement | null>(null)
  const ipqcMaterialInput   = ref<HTMLInputElement | null>(null)
  const ipqcSlotInput       = ref<HTMLInputElement | null>(null)

  const ipqcSavedCorrectStates = ref<Map<string, unknown>>(new Map())

  // ── UI helper computeds ────────────────────────────────────────────────────

  const operationModeName = computed(() => {
    if (isUnloadMode.value) {
      return unloadModeType.value === "force_single_slot"
        ? MATERIAL_FORCE_UNLOAD_MODE_NAME
        : MATERIAL_UNLOAD_MODE_NAME
    }
    if (isIpqcMode.value) return MATERIAL_IPQC_MODE_NAME
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

  // ── Focus helpers ──────────────────────────────────────────────────────────

  function focusUnloadMaterialInput() {
    nextTick(() => { unloadMaterialInput.value?.focus() })
  }

  function focusUnloadSlotInput() {
    nextTick(() => { unloadSlotInput.value?.focus() })
  }

  function focusByCurrentPhase() {
    if (isForceUnloadSlotPhase.value || isReplaceSlotPhase.value) {
      focusUnloadSlotInput()
    } else {
      focusUnloadMaterialInput()
    }
  }

  function focusIpqcMaterialInput() {
    nextTick(() => { ipqcMaterialInput.value?.focus() })
  }

  function focusIpqcSlotInput() {
    nextTick(() => { ipqcSlotInput.value?.focus() })
  }

  // ── Grid helpers ───────────────────────────────────────────────────────────

  function updateRowInGrid(row: any) {
    try { adapter.applyGridTransaction([row]) } catch { /* grid not ready */ }
  }

  function bulkUpdateGrid() {
    try { adapter.applyGridTransaction(rowData.value) } catch { /* grid not ready */ }
  }

  // ── Row search helpers ─────────────────────────────────────────────────────

  function findRowBySlotIdno(slotIdno: string): any | null {
    return adapter.findRowBySlotInput(slotIdno, rowData.value)
  }

  // ── Duplicate detection ────────────────────────────────────────────────────

  function isBarcodeAlreadyInGrid(barcode: string): boolean {
    return rowData.value.some((row: any) => {
      if (String(row.materialInventoryIdno ?? "").trim() === barcode) return true
      const appended = String(row.appendedMaterialInventoryIdno ?? "").trim()
      return appended.split(",").some((c: string) => c.trim() === barcode)
    })
  }

  // ── IPQC columns ───────────────────────────────────────────────────────────

  function showIpqcColumns(visible: boolean) {
    adapter.setColumnVisible("inspectMaterialPackCode", visible)
    adapter.setColumnVisible("inspectTime", visible)
    adapter.setColumnVisible("inspectCount", visible)
    adapter.setColumnVisible("inspectorIdno", visible)
    adapter.toggleNormalColumnsForIpqc?.(visible)
  }

  // ── Mode entry/exit ────────────────────────────────────────────────────────

  function enterUnloadMode(modeType: Parameters<typeof machine.enterUnloadMode>[0]) {
    machine.enterUnloadMode(modeType)
    unloadMaterialValue.value = ""
    unloadSlotValue.value = ""
    clearNormalScanState()
    nextTick(() => {
      if (modeType === "force_single_slot") {
        focusUnloadSlotInput()
      } else {
        focusUnloadMaterialInput()
      }
    })
  }

  function exitUnloadMode() {
    machine.exitToNormal()
    unloadMaterialValue.value = ""
    unloadSlotValue.value = ""
    clearNormalScanState()
    focusMaterialInput()
  }

  function enterIpqcMode() {
    machine.enterIpqcMode()
    clearNormalScanState()

    const saved = new Map<string, unknown>()
    for (const row of rowData.value) {
      const key = adapter.toRowKey(row)
      saved.set(key, row.correct)
      row.correct = PRODUCTION_CORRECT.UNLOADED
    }
    ipqcSavedCorrectStates.value = saved

    bulkUpdateGrid()
    showIpqcColumns(true)
    focusIpqcMaterialInput()
  }

  function exitIpqcMode() {
    machine.exitToNormal()
    for (const row of rowData.value) {
      const key = adapter.toRowKey(row)
      const saved = ipqcSavedCorrectStates.value.get(key)
      if (saved !== undefined) {
        row.correct = saved
      }
    }
    ipqcSavedCorrectStates.value.clear()

    bulkUpdateGrid()
    showIpqcColumns(false)
    ipqcMaterialValue.value = ""
    ipqcSlotValue.value = ""
    clearNormalScanState()
    focusMaterialInput()
  }

  function toggleIpqcMode() {
    if (isIpqcMode.value) {
      exitIpqcMode()
    } else {
      enterIpqcMode()
    }
  }

  // ── Mode trigger dispatch ──────────────────────────────────────────────────

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
      toggleIpqcMode()
      return true
    }
    if (code === MATERIAL_EXIT_TRIGGER && isIpqcMode.value) {
      exitIpqcMode()
      return true
    }
    return false
  }

  function handleModeTriggerFromUnloadInput(code: string): boolean {
    if (code === MATERIAL_IPQC_TRIGGER) {
      exitUnloadMode()
      enterIpqcMode()
      return true
    }
    if (code === MATERIAL_EXIT_TRIGGER || code === MATERIAL_UNLOAD_TRIGGER || code === MATERIAL_FORCE_UNLOAD_TRIGGER) {
      exitUnloadMode()
      return true
    }
    return false
  }

  function handleBeforeMaterialScan(barcode: string): boolean {
    const code = barcode.trim().toUpperCase()
    if (handleModeTriggerFromNormalInput(code)) return false
    if (!isIpqcMode.value && isBarcodeAlreadyInGrid(barcode.trim())) {
      showError("重複掃描：此條碼已存在於目前站位資料")
      return false
    }
    return true
  }

  function handleBeforeSlotSubmit(raw: string): boolean {
    if (handleModeTriggerFromNormalInput(raw.trim().toUpperCase())) return false
    const row = findRowBySlotIdno(raw.trim())
    if (row && String(row.appendedMaterialInventoryIdno ?? "").trim()) {
      showError(`站位 ${raw.trim()} 已有接料，請先卸除當前料捲`)
      return false
    }
    return true
  }

  // ── IPQC handlers ──────────────────────────────────────────────────────────

  async function handleIpqcMaterialSubmit() {
    const materialPackCode = ipqcMaterialValue.value.trim()
    if (!materialPackCode) return

    const code = materialPackCode.toUpperCase()
    if (code === MATERIAL_EXIT_TRIGGER || code === MATERIAL_IPQC_TRIGGER) {
      exitIpqcMode(); ipqcMaterialValue.value = ""; return
    }
    if (code === USER_SWITCH_TRIGGER) {
      exitIpqcMode(); handleUserSwitchTrigger(code); ipqcMaterialValue.value = ""; return
    }
    if (code === MATERIAL_UNLOAD_TRIGGER || code === MATERIAL_FORCE_UNLOAD_TRIGGER) {
      exitIpqcMode()
      ipqcMaterialValue.value = ""
      enterUnloadMode(code === MATERIAL_FORCE_UNLOAD_TRIGGER ? "force_single_slot" : "pack_auto_slot")
      return
    }

    const isValid = await doIpqcValidation(materialPackCode)
    if (!isValid) {
      ipqcMaterialValue.value = ""
      focusIpqcMaterialInput()
      return
    }

    ipqcMaterialValue.value = materialPackCode
    showSuccess(msg.ipqc.materialScanned(materialPackCode))
    focusIpqcSlotInput()
  }

  async function handleIpqcSlotSubmit() {
    const slotIdno = ipqcSlotValue.value.trim()
    if (!slotIdno) return

    const code = slotIdno.toUpperCase()
    if (code === MATERIAL_EXIT_TRIGGER || code === MATERIAL_IPQC_TRIGGER) {
      exitIpqcMode(); ipqcSlotValue.value = ""; return
    }

    const materialPackCode = ipqcMaterialValue.value.trim()
    const row = findRowBySlotIdno(slotIdno)
    if (!row) {
      showError(`找不到槽位 ${slotIdno}`)
      ipqcSlotValue.value = ""
      focusIpqcSlotInput()
      return
    }

    // 確認料號符合槽位
    const appended = String(row.appendedMaterialInventoryIdno ?? "").trim()
    const appendedCodes = appended ? appended.split(",").map((s: string) => s.trim()).filter(Boolean) : []
    const currentPackCode = appendedCodes.length > 0
      ? appendedCodes[appendedCodes.length - 1]
      : String(row.materialInventoryIdno ?? "").trim()

    if (materialPackCode !== currentPackCode) {
      showError(`料號不符：掃描 ${materialPackCode}，槽位應為 ${currentPackCode}`)
      ipqcSlotValue.value = ""
      ipqcMaterialValue.value = ""
      focusIpqcMaterialInput()
      return
    }

    // 更新 row 欄位
    row.correct = PRODUCTION_CORRECT.MATCHED
    row.inspectMaterialPackCode = materialPackCode
    row.inspectTime  = new Date().toISOString()
    row.inspectCount = (row.inspectCount ?? 0) + 1
    row.inspectorIdno = currentUsername.value || null

    // 可選：品牌額外欄位（如 Panasonic 的 remark）
    adapter.afterIpqcRowUpdate?.(row)

    updateRowInGrid(row)

    // 品牌專屬即時上傳（try/catch 在 adapter 內處理）
    await adapter.submitIpqcRow(row, materialPackCode, currentUsername.value)

    showSuccess(msg.ipqc.inspectionSuccess(materialPackCode, slotIdno))
    ipqcSlotValue.value = ""
    ipqcMaterialValue.value = ""
    focusIpqcMaterialInput()
  }

  // ── Unload workflow handlers ───────────────────────────────────────────────

  async function handleUnloadMaterialSubmit(materialPackCode: string) {
    const resolved = options.findUniqueUnloadSlotByPackCode(materialPackCode)
    if (resolved.ok === false) {
      showError(resolved.error)
      unloadMaterialValue.value = ""
      focusUnloadMaterialInput()
      return
    }

    const isValid = isMockMode || await options.validateUnloadMaterialPackCode(materialPackCode)
    if (!isValid) {
      unloadMaterialValue.value = ""
      focusUnloadMaterialInput()
      return
    }

    const success = await options.submitUnload({
      materialPackCode,
      slotIdno: resolved.slotIdno,
    })

    unloadMaterialValue.value = ""
    if (!success) {
      focusUnloadMaterialInput()
      return
    }

    machine.onUnloadSubmitted(resolved.slotIdno)
    focusUnloadMaterialInput()
  }

  async function handleForceUnloadSlotSubmit(slotIdno: string) {
    const result = await options.submitForceUnloadBySlot({
      slotIdno,
      unfeedReason: "WRONG_MATERIAL",
    })

    unloadSlotValue.value = ""
    if (!result.ok) {
      focusUnloadSlotInput()
      return
    }

    machine.onForceUnloadSubmitted(result.slotIdno ?? slotIdno)
    focusUnloadMaterialInput()
  }

  async function handleReplacementMaterialSubmit(materialPackCode: string) {
    const targetSlotIdno = resolvedUnloadSlotIdno.value.trim()
    if (!targetSlotIdno) {
      showError("找不到卸料站位，請重新掃描")
      machine.enterUnloadMode(unloadModeType.value)
      unloadMaterialValue.value = ""
      nextTick(() => {
        if (isForceUnloadSlotPhase.value) {
          focusUnloadSlotInput()
        } else {
          focusUnloadMaterialInput()
        }
      })
      return
    }

    const canReplace = isMockMode || await options.validateReplacementMaterialForSlot({
      materialPackCode,
      slotIdno: targetSlotIdno,
    })

    unloadMaterialValue.value = ""
    if (!canReplace) {
      focusUnloadMaterialInput()
      return
    }

    machine.onReplacementMaterialScanned(materialPackCode)
    unloadSlotValue.value = ""
    focusUnloadSlotInput()
  }

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

    // ── Replace slot phase ──────────────────────────────────────────────────

    const targetSlotIdno      = resolvedUnloadSlotIdno.value.trim()
    const replacementPackCode = replacementMaterialPackCode.value.trim()

    if (!adapter.slotsMatch(slotIdno, targetSlotIdno)) {
      showError(`請掃描原卸料站位 ${targetSlotIdno}`)
      unloadSlotValue.value = ""
      focusUnloadSlotInput()
      return
    }

    if (!replacementPackCode) {
      showError("找不到更換捲號，請重新掃描")
      machine.enterUnloadMode(unloadModeType.value)
      focusUnloadMaterialInput()
      return
    }

    const success = await options.submitReplace({
      materialPackCode: replacementPackCode,
      slotIdno: targetSlotIdno,
    })

    unloadSlotValue.value = ""
    if (!success) {
      focusUnloadSlotInput()
      return
    }

    exitUnloadMode()
  }

  // ── Return ─────────────────────────────────────────────────────────────────

  return {
    // Machine state
    isUnloadMode,
    isIpqcMode,
    isUnloadScanPhase,
    isForceUnloadSlotPhase,
    isReplaceMaterialPhase,
    isReplaceSlotPhase,
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
    // Input DOM refs
    unloadMaterialInput,
    unloadSlotInput,
    ipqcMaterialInput,
    ipqcSlotInput,
    // Mode control
    enterUnloadMode,
    exitUnloadMode,
    enterIpqcMode,
    exitIpqcMode,
    toggleIpqcMode,
    // Handlers
    handleBeforeMaterialScan,
    handleBeforeSlotSubmit,
    handleUnloadMaterialEnter,
    handleUnloadSlotSubmit,
    handleIpqcMaterialSubmit,
    handleIpqcSlotSubmit,
    // Helpers exposed for .vue
    findRowBySlotIdno,
  }
}

export type MounterProductionOperationFlowsCore = ReturnType<typeof useMounterProductionOperationFlowsCore>
