import { nextTick, ref } from "vue"
import type { ComputedRef, Ref } from "vue"
import type { ColumnApi, GridApi } from "ag-grid-community"
import type { MaterialRepositoryResult } from "@/application/barcode-scan/BarcodeScanDeps"
import type { IpqcInspectionRecord } from "@/domain/mounter/ipqcTypes"
import {
  useUnloadModeController,
  type UnloadModeType,
} from "@/ui/shared/composables/useUnloadModeController"
import { parsePanasonicSlotIdno } from "@/domain/slot/PanasonicSlotParser"
import { resolveMaterialLookupError } from "@/domain/material/MaterialLookupError"
import { appendMaterialCode, removeMaterialCode } from "@/domain/production/PostProductionFeedRules"
import {
  MATERIAL_EXIT_TRIGGER,
  MATERIAL_FORCE_UNLOAD_TRIGGER,
  MATERIAL_IPQC_TRIGGER,
  MATERIAL_UNLOAD_TRIGGER,
  USER_SWITCH_TRIGGER,
} from "@/domain/mounter/operationModes"
import type { PanasonicUnloadRecord, PanasonicSpliceRecord } from "./panasonicDetailTypes"

// Use only the public methods we actually call to avoid Vue's UnwrapRef stripping
// private class members from GridApi/ColumnApi, which would break Ref<T> assignability.
type GridApiRef = Ref<Pick<GridApi, "applyTransaction"> | null>
type ColumnApiRef = Ref<Pick<ColumnApi, "setColumnVisible"> | null>

interface PanasonicOperationFlowsOptions {
  rowData: Ref<any[]>
  gridApi: GridApiRef
  columnApi: ColumnApiRef
  currentUsername: ComputedRef<string | null>
  isTestingMode: boolean
  isMockMode: boolean
  fetchMaterialInventory: (id: string) => Promise<MaterialRepositoryResult>
  showError: (msg: string) => void
  handleUserSwitchTrigger: (code: string) => boolean
  clearNormalScanState: () => void
  focusMaterialInput: () => void
  persistNow: () => void
  pendingUnloadRecords: Ref<PanasonicUnloadRecord[]>
  pendingSpliceRecords: Ref<PanasonicSpliceRecord[]>
  pendingIpqcRecords: Ref<IpqcInspectionRecord[]>
}

export function usePanasonicOperationFlows(options: PanasonicOperationFlowsOptions) {
  const {
    rowData, gridApi, columnApi, currentUsername, isTestingMode, isMockMode,
    fetchMaterialInventory, showError, handleUserSwitchTrigger,
    clearNormalScanState, focusMaterialInput, persistNow,
    pendingUnloadRecords, pendingSpliceRecords, pendingIpqcRecords,
  } = options

  // ── State ──────────────────────────────────────────────────────────────────

  const isUnloadMode = ref(false)
  const isIpqcMode = ref(false)
  const replacementCorrectState = ref<"true" | "warning" | null>(null)

  const ipqcMaterialValue = ref("")
  const ipqcSlotValue = ref("")
  const ipqcMaterialInput = ref<HTMLInputElement | null>(null)
  const ipqcSlotInput = ref<HTMLInputElement | null>(null)
  const ipqcSavedCorrectStates = ref<Map<string, unknown>>(new Map())

  // These are returned so the template can bind them via :ref
  const unloadMaterialInput = ref<HTMLInputElement | null>(null)
  const unloadSlotInput = ref<HTMLInputElement | null>(null)

  // ── Unload mode controller ─────────────────────────────────────────────────

  const {
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
    resetUnloadFlowState: controllerResetUnloadFlowState,
    focusUnloadMaterialInput,
    focusUnloadSlotInput,
    focusByCurrentPhase,
  } = useUnloadModeController({
    isUnloadMode,
    isIpqcMode,
    toCanonicalSlot: toCanonicalPanasonicSlot,
    getUnloadMaterialInputRef: () => unloadMaterialInput.value,
    getUnloadSlotInputRef: () => unloadSlotInput.value,
  })

  // ── Helper functions ───────────────────────────────────────────────────────

  function parseAppendedCodes(value: string | null | undefined): string[] {
    const raw = String(value ?? "").trim()
    if (!raw) return []
    return raw.split(",").map((code) => code.trim()).filter((code) => code.length > 0)
  }

  function toRowSlotIdno(row: any): string {
    const slot = String(row.slotIdno ?? "").trim()
    const subSlot = String(row.subSlotIdno ?? "").trim()
    return subSlot ? `${slot}-${subSlot}` : slot
  }

  function toCanonicalPanasonicSlot(raw: string): string | null {
    const parsed = parsePanasonicSlotIdno(raw)
    if (!parsed) return null
    const slot = String(parsed.slot ?? "").trim()
    const subSlot = String(parsed.subSlot ?? "").trim().toUpperCase()
    if (!slot) return null
    return subSlot ? `${slot}-${subSlot}` : slot
  }

  function updateRowInGrid(row: any) {
    try {
      gridApi.value?.applyTransaction?.({ update: [row] })
    } catch {
      // Grid might not be ready
    }
  }

  function findRowBySlotIdno(slotIdno: string) {
    const parsed = parsePanasonicSlotIdno(slotIdno)
    if (!parsed) return null
    return (rowData.value ?? []).find(
      (row: any) =>
        String(row.slotIdno ?? "").trim() === String(parsed.slot ?? "").trim() &&
        String(row.subSlotIdno ?? "").trim() === String(parsed.subSlot ?? "").trim()
    )
  }

  function findUniqueUnloadSlotByPackCode(materialPackCode: string) {
    const targetPackCode = materialPackCode.trim()
    if (!targetPackCode) return { ok: false as const, error: "請先輸入物料條碼" }

    const matchedRows = (rowData.value ?? []).filter((row: any) => {
      const inMain = String(row.materialInventoryIdno ?? "").trim() === targetPackCode
      const inAppended = parseAppendedCodes(row.appendedMaterialInventoryIdno).includes(targetPackCode)
      return inMain || inAppended
    })

    if (matchedRows.length === 0) return { ok: false as const, error: `找不到料號 ${targetPackCode} 對應的站位` }
    if (matchedRows.length > 1) {
      const slots = matchedRows.map((row: any) => toRowSlotIdno(row)).join(", ")
      return { ok: false as const, error: `料號 ${targetPackCode} 對應多個站位：${slots}` }
    }
    return { ok: true as const, row: matchedRows[0], slotIdno: toRowSlotIdno(matchedRows[0]) }
  }

  // ── Validation ─────────────────────────────────────────────────────────────

  async function validateUnloadMaterialPackCode(materialPackCode: string): Promise<boolean> {
    const trimmed = materialPackCode.trim()
    if (!trimmed) {
      showError("請先輸入物料條碼")
      return false
    }
    if (isTestingMode || isMockMode) return true
    const result = await fetchMaterialInventory(trimmed)
    if (result.kind !== "ok") {
      showError(resolveMaterialLookupError(result.error))
      return false
    }
    return true
  }

  async function resolveReplacementCorrectState(params: {
    materialPackCode: string
    slotIdno: string
  }): Promise<"true" | "warning" | null> {
    const materialPackCode = params.materialPackCode.trim()
    const slotIdno = params.slotIdno.trim()
    if (!materialPackCode) { showError("請先輸入物料條碼"); return null }

    const row = findRowBySlotIdno(slotIdno)
    if (!row) { showError(`找不到槽位 ${slotIdno}`); return null }

    if (isMockMode && !isTestingMode) return "true"
    if (isTestingMode) return "warning"

    const fetchResult = await fetchMaterialInventory(materialPackCode)
    if (fetchResult.kind !== "ok") {
      showError(resolveMaterialLookupError(fetchResult.error))
      return null
    }
    const scannedMaterialId = String(fetchResult.materialInventory.material_idno ?? "").trim()
    const expectedMaterialId = String(row.materialIdno ?? "").trim()
    if (!scannedMaterialId || scannedMaterialId !== expectedMaterialId) {
      showError(`料號不符：站位 ${slotIdno} 應為 ${expectedMaterialId}`)
      return null
    }
    return "true"
  }

  // ── Mode control ───────────────────────────────────────────────────────────

  function resetUnloadFlowState(modeType: UnloadModeType = unloadModeType.value) {
    controllerResetUnloadFlowState(modeType)
    replacementCorrectState.value = null
  }

  function showIpqcColumns(visible: boolean) {
    columnApi.value?.setColumnVisible("inspectMaterialPackCode", visible)
    columnApi.value?.setColumnVisible("inspectTime", visible)
    columnApi.value?.setColumnVisible("inspectCount", visible)
  }

  function focusIpqcMaterialInput() {
    nextTick(() => { ipqcMaterialInput.value?.focus() })
  }

  function focusIpqcSlotInput() {
    nextTick(() => { ipqcSlotInput.value?.focus() })
  }

  function enterUnloadMode(modeType: UnloadModeType) {
    isUnloadMode.value = true
    resetUnloadFlowState(modeType)
    clearNormalScanState()
    if (modeType === "force_single_slot") {
      focusUnloadSlotInput()
      return
    }
    focusUnloadMaterialInput()
  }

  function exitUnloadMode() {
    isUnloadMode.value = false
    resetUnloadFlowState("pack_auto_slot")
    clearNormalScanState()
    focusMaterialInput()
  }

  function enterIpqcMode() {
    isIpqcMode.value = true
    if (isUnloadMode.value) exitUnloadMode()
    clearNormalScanState()

    const saved = new Map<string, unknown>()
    for (const row of rowData.value) {
      const key = `${row.slotIdno}-${row.subSlotIdno ?? ""}`
      saved.set(key, row.correct)
      row.correct = "unloaded"
      updateRowInGrid(row)
    }
    ipqcSavedCorrectStates.value = saved

    showIpqcColumns(true)
    focusIpqcMaterialInput()
  }

  function exitIpqcMode() {
    isIpqcMode.value = false
    for (const row of rowData.value) {
      const key = `${row.slotIdno}-${row.subSlotIdno ?? ""}`
      const saved = ipqcSavedCorrectStates.value.get(key)
      if (saved !== undefined) {
        row.correct = saved
        updateRowInGrid(row)
      }
    }
    ipqcSavedCorrectStates.value.clear()
    showIpqcColumns(false)
    ipqcMaterialValue.value = ""
    ipqcSlotValue.value = ""
    focusMaterialInput()
  }

  // ── IPQC handlers ──────────────────────────────────────────────────────────

  function getCurrentPackCode(row: any): string {
    const appended = parseAppendedCodes(row.appendedMaterialInventoryIdno)
    if (appended.length > 0) return appended[appended.length - 1]
    return String(row.materialInventoryIdno ?? "").trim()
  }

  async function handleIpqcMaterialSubmit() {
    const materialPackCode = ipqcMaterialValue.value.trim()
    if (!materialPackCode) return

    const code = materialPackCode.toUpperCase()
    if (code === MATERIAL_EXIT_TRIGGER || code === MATERIAL_IPQC_TRIGGER) {
      exitIpqcMode()
      ipqcMaterialValue.value = ""
      return
    }
    if (code === USER_SWITCH_TRIGGER) {
      exitIpqcMode()
      handleUserSwitchTrigger(code)
      ipqcMaterialValue.value = ""
      return
    }
    if (code === MATERIAL_UNLOAD_TRIGGER) {
      exitIpqcMode()
      enterUnloadMode("pack_auto_slot")
      ipqcMaterialValue.value = ""
      return
    }
    if (code === MATERIAL_FORCE_UNLOAD_TRIGGER) {
      exitIpqcMode()
      enterUnloadMode("force_single_slot")
      ipqcMaterialValue.value = ""
      return
    }

    const isValid = await validateUnloadMaterialPackCode(materialPackCode)
    if (!isValid) {
      ipqcMaterialValue.value = ""
      focusIpqcMaterialInput()
      return
    }

    ipqcMaterialValue.value = materialPackCode
    focusIpqcSlotInput()
  }

  function handleIpqcSlotSubmit() {
    const slotIdno = ipqcSlotValue.value.trim()
    if (!slotIdno) return

    const code = slotIdno.toUpperCase()
    if (code === MATERIAL_EXIT_TRIGGER || code === MATERIAL_IPQC_TRIGGER) {
      exitIpqcMode()
      ipqcSlotValue.value = ""
      return
    }

    const materialPackCode = ipqcMaterialValue.value.trim()
    const row = findRowBySlotIdno(slotIdno)
    if (!row) {
      showError(`找不到槽位 ${slotIdno}`)
      ipqcSlotValue.value = ""
      focusIpqcSlotInput()
      return
    }

    const currentPackCode = getCurrentPackCode(row)
    if (materialPackCode !== currentPackCode) {
      showError(`料號不符：掃描 ${materialPackCode}，槽位應為 ${currentPackCode}`)
      ipqcSlotValue.value = ""
      ipqcMaterialValue.value = ""
      focusIpqcMaterialInput()
      return
    }

    row.correct = "true"
    row.inspectMaterialPackCode = materialPackCode
    row.inspectTime = new Date().toISOString()
    row.inspectCount = (row.inspectCount ?? 0) + 1
    updateRowInGrid(row)

    pendingIpqcRecords.value = [
      ...pendingIpqcRecords.value,
      {
        slotIdno: row.slotIdno,
        subSlotIdno: row.subSlotIdno ?? null,
        materialPackCode,
        inspectorIdno: currentUsername.value || "",
        inspectionTime: new Date().toISOString(),
      },
    ]

    ipqcSlotValue.value = ""
    ipqcMaterialValue.value = ""
    focusIpqcMaterialInput()
    persistNow()
  }

  // ── Mode transitions ───────────────────────────────────────────────────────

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
    if (code === MATERIAL_UNLOAD_TRIGGER || code === MATERIAL_FORCE_UNLOAD_TRIGGER) {
      exitUnloadMode()
      return true
    }
    return false
  }

  async function handleBeforeMaterialScan(barcode: string) {
    return !handleModeTriggerFromNormalInput(barcode.trim().toUpperCase())
  }

  async function handleBeforeSlotSubmit(raw: string) {
    return !handleModeTriggerFromNormalInput(raw.trim().toUpperCase())
  }

  // ── Unload workflow ────────────────────────────────────────────────────────

  function pushUnloadRecord(record: PanasonicUnloadRecord) {
    pendingUnloadRecords.value = [...pendingUnloadRecords.value, record]
    persistNow()
  }

  function applyUnloadToRow(row: any, materialPackCode: string) {
    const inMain = String(row.materialInventoryIdno ?? "").trim() === materialPackCode
    const inAppended = parseAppendedCodes(row.appendedMaterialInventoryIdno).includes(materialPackCode)
    if (inMain) { row.materialInventoryIdno = ""; row.correct = "unloaded" }
    if (inAppended) {
      row.appendedMaterialInventoryIdno = removeMaterialCode(row.appendedMaterialInventoryIdno, materialPackCode)
    }
    updateRowInGrid(row)
  }

  function resetToInitialUnloadPhase() {
    unloadReplacePhase.value =
      unloadModeType.value === "force_single_slot" ? "force_unload_slot_scan" : "unload_scan"
  }

  async function handleUnloadMaterialSubmit(materialPackCode: string) {
    const isValidPackCode = await validateUnloadMaterialPackCode(materialPackCode)
    if (!isValidPackCode) {
      unloadMaterialValue.value = ""
      focusUnloadMaterialInput()
      return
    }

    const resolved = findUniqueUnloadSlotByPackCode(materialPackCode)
    if (!resolved.ok || !resolved.row) {
      showError(resolved.error ?? "找不到對應槽位")
      unloadMaterialValue.value = ""
      focusUnloadMaterialInput()
      return
    }

    const operationTime = new Date().toISOString()
    pushUnloadRecord({
      slotIdno: resolved.row.slotIdno,
      subSlotIdno: resolved.row.subSlotIdno ?? null,
      materialPackCode,
      unfeedReason: "MATERIAL_FINISHED",
      operationTime,
    })

    applyUnloadToRow(resolved.row, materialPackCode)

    unloadMaterialValue.value = ""
    resolvedUnloadSlotIdno.value = resolved.slotIdno ?? ""
    unloadReplacePhase.value = "replace_material_scan"
    focusUnloadMaterialInput()
  }

  async function handleForceUnloadSlotSubmit(slotIdno: string) {
    const row = findRowBySlotIdno(slotIdno)
    if (!row) {
      showError(`找不到槽位 ${slotIdno}`)
      unloadSlotValue.value = ""
      focusUnloadSlotInput()
      return
    }

    const appendedCodes = parseAppendedCodes(row.appendedMaterialInventoryIdno)
    const preferredPackCode = appendedCodes[appendedCodes.length - 1]
    const mainPackCode = String(row.materialInventoryIdno ?? "").trim()
    const materialPackCode = String(preferredPackCode ?? mainPackCode).trim()

    if (!materialPackCode) {
      showError(`槽位 ${slotIdno} 無可卸除料號`)
      unloadSlotValue.value = ""
      focusUnloadSlotInput()
      return
    }

    const operationTime = new Date().toISOString()
    pushUnloadRecord({
      slotIdno: row.slotIdno,
      subSlotIdno: row.subSlotIdno ?? null,
      materialPackCode,
      unfeedReason: "WRONG_MATERIAL",
      operationTime,
    })

    applyUnloadToRow(row, materialPackCode)

    unloadSlotValue.value = ""
    resolvedUnloadSlotIdno.value = toRowSlotIdno(row)
    unloadReplacePhase.value = "replace_material_scan"
    focusUnloadMaterialInput()
  }

  async function handleReplacementMaterialSubmit(materialPackCode: string) {
    const targetSlotIdno = resolvedUnloadSlotIdno.value.trim()
    if (!targetSlotIdno) {
      showError("找不到卸料站位，請重新掃描")
      resetToInitialUnloadPhase()
      unloadMaterialValue.value = ""
      if (isForceUnloadSlotPhase.value) focusUnloadSlotInput()
      else focusUnloadMaterialInput()
      return
    }

    const correctState = await resolveReplacementCorrectState({ materialPackCode, slotIdno: targetSlotIdno })

    unloadMaterialValue.value = ""
    if (!correctState) {
      focusUnloadMaterialInput()
      return
    }

    replacementMaterialPackCode.value = materialPackCode
    replacementCorrectState.value = correctState
    unloadReplacePhase.value = "replace_slot_scan"
    unloadSlotValue.value = ""
    focusUnloadSlotInput()
  }

  function handleUnloadMaterialEnter() {
    const material = unloadMaterialValue.value.trim()
    unloadMaterialValue.value = material
    if (!material) return

    if (handleModeTriggerFromUnloadInput(material.toUpperCase())) return

    if (isUnloadScanPhase.value) { void handleUnloadMaterialSubmit(material); return }
    if (isReplaceMaterialPhase.value) { void handleReplacementMaterialSubmit(material) }
  }

  async function handleUnloadSlotSubmit() {
    if (!isUnloadMode.value) return

    const slotIdno = unloadSlotValue.value.trim()
    const slotCommand = slotIdno.toUpperCase()
    const targetSlotIdno = resolvedUnloadSlotIdno.value.trim()
    const replacementPackCode = replacementMaterialPackCode.value.trim()
    const correctState = replacementCorrectState.value

    if (!slotIdno) { showError("請輸入站位"); focusUnloadSlotInput(); return }
    if (handleModeTriggerFromUnloadInput(slotCommand)) return
    if (isForceUnloadSlotPhase.value) { void handleForceUnloadSlotSubmit(slotIdno); return }
    if (!isReplaceSlotPhase.value) { focusUnloadSlotInput(); return }

    const normalizedInput = toCanonicalPanasonicSlot(slotIdno)
    const normalizedTarget = toCanonicalPanasonicSlot(targetSlotIdno)
    if (!normalizedInput || !normalizedTarget || normalizedInput !== normalizedTarget) {
      showError(`請掃描原卸料站位 ${targetSlotIdno}`)
      unloadSlotValue.value = ""
      focusUnloadSlotInput()
      return
    }

    if (!replacementPackCode || !correctState) {
      showError("找不到更換捲號，請重新掃描")
      unloadReplacePhase.value = "replace_material_scan"
      focusUnloadMaterialInput()
      return
    }

    const row = findRowBySlotIdno(targetSlotIdno)
    if (!row) {
      showError(`找不到槽位 ${targetSlotIdno}`)
      resetToInitialUnloadPhase()
      focusUnloadMaterialInput()
      return
    }

    row.materialInventoryIdno = replacementPackCode
    row.correct = correctState
    row.operatorIdno = currentUsername.value || null
    row.firstAppendTime = row.firstAppendTime ?? new Date().toISOString()
    if (correctState === "warning") row.remark = "[測試模式綁定]"

    updateRowInGrid(row)

    pendingSpliceRecords.value = [
      ...pendingSpliceRecords.value,
      {
        slotIdno: row.slotIdno,
        subSlotIdno: row.subSlotIdno ?? null,
        materialPackCode: replacementPackCode,
        correctState,
        operationTime: new Date().toISOString(),
      },
    ]
    persistNow()

    unloadSlotValue.value = ""
    exitUnloadMode()
  }

  // ── Upload callbacks ────────────────────────────────────────────────────────

  function onUnloadUploaded(ok: boolean) {
    if (!ok) return
    pendingUnloadRecords.value = []
    persistNow()
  }

  function onIpqcUploaded(ok: boolean) {
    if (!ok) return
    pendingIpqcRecords.value = []
    persistNow()
  }

  // ── appendMaterialCode helper (used by onSlotSubmit in .vue) ──────────────
  // Exposed so .vue onSlotSubmit can use it without importing domain directly
  function appendMaterialCodeToRow(currentValue: string, packCode: string) {
    return appendMaterialCode(currentValue, packCode)
  }

  return {
    // Mode state
    isUnloadMode,
    isIpqcMode,
    // Unload mode controller values
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
    focusByCurrentPhase,
    // Input refs for template :ref binding
    unloadMaterialInput,
    unloadSlotInput,
    // IPQC
    ipqcMaterialValue,
    ipqcSlotValue,
    ipqcMaterialInput,
    ipqcSlotInput,
    // Handlers
    enterUnloadMode,
    exitUnloadMode,
    enterIpqcMode,
    exitIpqcMode,
    handleBeforeMaterialScan,
    handleBeforeSlotSubmit,
    handleUnloadMaterialEnter,
    handleUnloadSlotSubmit,
    handleIpqcMaterialSubmit,
    handleIpqcSlotSubmit,
    handleModeTriggerFromNormalInput,
    // Upload callbacks
    onUnloadUploaded,
    onIpqcUploaded,
    // Helpers exposed for .vue
    findRowBySlotIdno,
    updateRowInGrid,
    appendMaterialCodeToRow,
  }
}
