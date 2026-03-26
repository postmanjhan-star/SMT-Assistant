import { computed, nextTick, ref } from "vue"
import type { ComputedRef, Ref } from "vue"
import type { ColumnApi, GridApi } from "ag-grid-community"

// GridApi has private class members that break Ref<T> assignability, so we
// use a structural Pick of only the methods we actually call.
type FujiPreGridApi = Pick<GridApi, "applyTransaction">
type FujiPreColumnApi = Pick<ColumnApi, "setColumnVisible">

import { parseFujiSlotIdno } from "@/domain/slot/FujiSlotParser"
import { resolveMaterialLookupError } from "@/domain/material/MaterialLookupError"
import {
  MATERIAL_UNLOAD_TRIGGER,
  MATERIAL_FORCE_UNLOAD_TRIGGER,
  MATERIAL_EXIT_TRIGGER,
  MATERIAL_IPQC_TRIGGER,
  MATERIAL_UNLOAD_MODE_NAME,
  MATERIAL_FORCE_UNLOAD_MODE_NAME,
  MATERIAL_IPQC_MODE_NAME,
  MATERIAL_FEED_MODE_NAME,
  USER_SWITCH_TRIGGER,
} from "@/domain/mounter/operationModes"
import { useOperationModeStateMachine } from "@/ui/shared/composables/useOperationModeStateMachine"
import type { UnloadModeType } from "@/ui/shared/composables/useOperationModeStateMachine"
import type { MaterialRepositoryResult } from "@/application/barcode-scan/BarcodeScanDeps"
import type { IpqcInspectionRecord } from "@/domain/mounter/ipqcTypes"
import type {
  FujiPreproductionUnloadRecord,
  FujiPreproductionSpliceRecord,
} from "./fujiPreproductionDetailTypes"

// ────────────────────────────────────────────────────────────────
// Options
// ────────────────────────────────────────────────────────────────

export type FujiPreproductionOperationFlowsOptions = {
  // Grid
  getGridApi: () => FujiPreGridApi | null
  getColumnApi: () => FujiPreColumnApi | null
  // Data
  rowData: Ref<any[]>
  mounterIdno: ComputedRef<string>
  // User
  currentUsername: ComputedRef<string | null>
  // Mode
  isTestingMode: Ref<boolean>
  isMockMode: boolean
  // Port (no @/client)
  fetchMaterialInventory: (id: string) => Promise<MaterialRepositoryResult>
  // UI callbacks
  showError: (msg: string) => void
  handleUserSwitchTrigger: (code: string) => boolean
  clearNormalScanState: () => void
  focusMaterialInput: () => void
  persistNow: () => void
  // Records
  pendingUnloadRecords: Ref<FujiPreproductionUnloadRecord[]>
  pendingSpliceRecords: Ref<FujiPreproductionSpliceRecord[]>
  pendingIpqcRecords: Ref<IpqcInspectionRecord[]>
}

// ────────────────────────────────────────────────────────────────
// Composable
// ────────────────────────────────────────────────────────────────

export function useFujiPreproductionOperationFlows(options: FujiPreproductionOperationFlowsOptions) {
  const {
    getGridApi, getColumnApi,
    rowData, mounterIdno, currentUsername,
    isTestingMode, isMockMode,
    fetchMaterialInventory, showError, handleUserSwitchTrigger,
    clearNormalScanState, focusMaterialInput, persistNow,
    pendingUnloadRecords, pendingSpliceRecords, pendingIpqcRecords,
  } = options

  // ── State machine ──────────────────────────────────────────────
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

  const replacementCorrectState = ref<"MATCHED_MATERIAL_PACK" | "TESTING_MATERIAL_PACK" | null>(null)

  // ── Input values (v-model) ─────────────────────────────────────
  const unloadMaterialValue = ref("")
  const unloadSlotValue = ref("")
  const ipqcMaterialValue = ref("")
  const ipqcSlotValue = ref("")

  // ── Input DOM refs ─────────────────────────────────────────────
  const unloadMaterialInput = ref<HTMLInputElement | null>(null)
  const unloadSlotInput = ref<HTMLInputElement | null>(null)
  const ipqcMaterialInput = ref<HTMLInputElement | null>(null)
  const ipqcSlotInput = ref<HTMLInputElement | null>(null)

  // ── IPQC saved states ──────────────────────────────────────────
  const ipqcSavedCorrectStates = ref<Map<string, unknown>>(new Map())

  // ── UI helper computeds ────────────────────────────────────────

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

  // ── Helper functions ───────────────────────────────────────────

  function toRowKey(row: any): string {
    return `${row.mounterIdno}-${row.stage}-${row.slot}`
  }

  function toRowSlotIdno(row: any): string {
    return `${row.mounterIdno}-${row.stage}-${row.slot}`
  }

  function updateRowInGrid(row: any) {
    try {
      getGridApi()?.applyTransaction?.({ update: [row] })
    } catch {
      // Grid might not be ready
    }
  }

  function findRowBySlotIdno(slotIdno: string) {
    const parsed = parseFujiSlotIdno(slotIdno)
    if (!parsed) return null
    return (rowData.value ?? []).find(
      (row: any) =>
        Number(row.slot) === parsed.slot &&
        String(row.stage).trim() === String(parsed.stage).trim()
    )
  }

  function findUniqueUnloadSlotByPackCode(materialPackCode: string) {
    const targetPackCode = materialPackCode.trim()
    if (!targetPackCode) return { ok: false as const, error: "請先輸入物料條碼" }

    const matchedRows = (rowData.value ?? []).filter(
      (row: any) => String(row.materialInventoryIdno ?? "").trim() === targetPackCode
    )

    if (matchedRows.length === 0) {
      return { ok: false as const, error: `找不到料號 ${targetPackCode} 對應的站位` }
    }
    if (matchedRows.length > 1) {
      const slots = matchedRows.map((row: any) => toRowSlotIdno(row)).join(", ")
      return { ok: false as const, error: `料號 ${targetPackCode} 對應多個站位：${slots}` }
    }

    return {
      ok: true as const,
      row: matchedRows[0],
      slot: matchedRows[0].slot as number,
      stage: matchedRows[0].stage as string,
    }
  }

  // ── Validation ─────────────────────────────────────────────────

  async function validateUnloadMaterialPackCode(materialPackCode: string): Promise<boolean> {
    const trimmed = materialPackCode.trim()
    if (!trimmed) {
      showError("請先輸入物料條碼")
      return false
    }
    if (isTestingMode.value || isMockMode) return true
    const result = await fetchMaterialInventory(trimmed)
    if (result.kind !== "ok") {
      showError(resolveMaterialLookupError(result.error))
      return false
    }
    return true
  }

  async function resolveReplacementCorrectState(
    materialPackCode: string,
    targetSlotIdno: string
  ): Promise<"MATCHED_MATERIAL_PACK" | "TESTING_MATERIAL_PACK" | null> {
    const packCode = materialPackCode.trim()
    if (!packCode) { showError("請先輸入物料條碼"); return null }

    const row = findRowBySlotIdno(targetSlotIdno)
    if (!row) { showError(`找不到槽位 ${targetSlotIdno}`); return null }

    if (isMockMode && !isTestingMode.value) return "MATCHED_MATERIAL_PACK"
    if (isTestingMode.value) return "TESTING_MATERIAL_PACK"

    const fetchResult = await fetchMaterialInventory(packCode)
    if (fetchResult.kind !== "ok") {
      showError(resolveMaterialLookupError(fetchResult.error))
      return null
    }
    const scannedMaterialId = String(fetchResult.materialInventory.material_idno ?? "").trim()
    const expectedMaterialId = String(row.materialIdno ?? "").trim()
    if (!scannedMaterialId || scannedMaterialId !== expectedMaterialId) {
      showError(`料號不符：站位 ${targetSlotIdno} 應為 ${expectedMaterialId}`)
      return null
    }
    return "MATCHED_MATERIAL_PACK"
  }

  // ── IPQC helpers ───────────────────────────────────────────────

  function showIpqcColumns(visible: boolean) {
    getColumnApi()?.setColumnVisible("inspectMaterialPackCode", visible)
    getColumnApi()?.setColumnVisible("inspectTime", visible)
    getColumnApi()?.setColumnVisible("inspectCount", visible)
  }

  function focusUnloadMaterialInput() {
    nextTick(() => unloadMaterialInput.value?.focus())
  }

  function focusUnloadSlotInput() {
    nextTick(() => unloadSlotInput.value?.focus())
  }

  function focusByCurrentPhase() {
    if (isForceUnloadSlotPhase.value || isReplaceSlotPhase.value) {
      focusUnloadSlotInput()
    } else {
      focusUnloadMaterialInput()
    }
  }

  function focusIpqcMaterialInput() {
    nextTick(() => ipqcMaterialInput.value?.focus())
  }

  function focusIpqcSlotInput() {
    nextTick(() => ipqcSlotInput.value?.focus())
  }

  function parseAppendedCodes(value: string | null | undefined): string[] {
    if (!value) return []
    return value.split(",").map((s) => s.trim()).filter(Boolean)
  }

  function getCurrentPackCode(row: any): string {
    const appended = parseAppendedCodes(row.appendedMaterialInventoryIdno)
    if (appended.length > 0) return appended[appended.length - 1]
    return String(row.materialInventoryIdno ?? "").trim()
  }

  // ── Mode control ───────────────────────────────────────────────

  function enterUnloadMode(modeType: UnloadModeType) {
    machine.enterUnloadMode(modeType)
    replacementCorrectState.value = null
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
    replacementCorrectState.value = null
    unloadMaterialValue.value = ""
    unloadSlotValue.value = ""
    clearNormalScanState()
    focusMaterialInput()
  }

  function enterIpqcMode() {
    machine.enterIpqcMode()
    clearNormalScanState()

    // 儲存目前 correct 狀態，全部設為 ⛔
    const saved = new Map<string, unknown>()
    for (const row of rowData.value) {
      const key = toRowKey(row)
      saved.set(key, row.correct)
      row.correct = "UNLOADED"
      updateRowInGrid(row)
    }
    ipqcSavedCorrectStates.value = saved

    showIpqcColumns(true)
    focusIpqcMaterialInput()
  }

  function exitIpqcMode() {
    machine.exitToNormal()
    // 恢復原本 correct 狀態
    for (const row of rowData.value) {
      const key = toRowKey(row)
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

  // ── Mode trigger dispatch ──────────────────────────────────────

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

  async function handleBeforeMaterialScan(barcode: string): Promise<boolean> {
    return !handleModeTriggerFromNormalInput(barcode.trim().toUpperCase())
  }

  async function handleBeforeSlotSubmit(raw: string): Promise<boolean> {
    return !handleModeTriggerFromNormalInput(raw.trim().toUpperCase())
  }

  // ── IPQC handlers ──────────────────────────────────────────────

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
    if (code === MATERIAL_UNLOAD_TRIGGER) {
      exitIpqcMode(); enterUnloadMode("pack_auto_slot"); ipqcMaterialValue.value = ""; return
    }
    if (code === MATERIAL_FORCE_UNLOAD_TRIGGER) {
      exitIpqcMode(); enterUnloadMode("force_single_slot"); ipqcMaterialValue.value = ""; return
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

    // 比對掃描的捲號 vs 槽位目前的捲號
    const currentPackCode = getCurrentPackCode(row)
    if (materialPackCode !== currentPackCode) {
      showError(`料號不符：掃描 ${materialPackCode}，槽位應為 ${currentPackCode}`)
      ipqcSlotValue.value = ""
      ipqcMaterialValue.value = ""
      focusIpqcMaterialInput()
      return
    }

    // 標記已巡檢 ✅
    row.correct = "MATCHED_MATERIAL_PACK"
    row.inspectMaterialPackCode = materialPackCode
    row.inspectTime = new Date().toISOString()
    row.inspectCount = (row.inspectCount ?? 0) + 1
    updateRowInGrid(row)

    const parsed = parseFujiSlotIdno(slotIdno)
    pendingIpqcRecords.value = [
      ...pendingIpqcRecords.value,
      {
        slotIdno: slotIdno,
        stage: parsed?.stage ?? "",
        slot: parsed?.slot ?? 0,
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

  // ── Unload workflow ────────────────────────────────────────────

  function pushUnloadRecord(record: FujiPreproductionUnloadRecord) {
    pendingUnloadRecords.value = [...pendingUnloadRecords.value, record]
    persistNow()
  }

  function applyUnloadToRow(row: any, materialPackCode: string) {
    if (String(row.materialInventoryIdno ?? "").trim() === materialPackCode) {
      row.materialInventoryIdno = ""
      row.correct = "UNLOADED"
    }
    updateRowInGrid(row)
  }

  async function handleUnloadMaterialSubmit(materialPackCode: string) {
    const isValid = await validateUnloadMaterialPackCode(materialPackCode)
    if (!isValid) {
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

    pushUnloadRecord({
      slot: resolved.slot,
      stage: resolved.stage,
      materialPackCode,
      unfeedReason: "MATERIAL_FINISHED",
      operationTime: new Date().toISOString(),
    })

    applyUnloadToRow(resolved.row, materialPackCode)

    unloadMaterialValue.value = ""
    machine.onUnloadSubmitted(toRowSlotIdno(resolved.row))
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

    const materialPackCode = String(row.materialInventoryIdno ?? "").trim()
    if (!materialPackCode) {
      showError(`槽位 ${slotIdno} 無可卸除料號`)
      unloadSlotValue.value = ""
      focusUnloadSlotInput()
      return
    }

    pushUnloadRecord({
      slot: row.slot as number,
      stage: row.stage as string,
      materialPackCode,
      unfeedReason: "WRONG_MATERIAL",
      operationTime: new Date().toISOString(),
    })

    applyUnloadToRow(row, materialPackCode)

    unloadSlotValue.value = ""
    machine.onForceUnloadSubmitted(toRowSlotIdno(row))
    focusUnloadMaterialInput()
  }

  async function handleReplacementMaterialSubmit(materialPackCode: string) {
    const targetSlotIdno = resolvedUnloadSlotIdno.value.trim()
    if (!targetSlotIdno) {
      showError("找不到卸料站位，請重新掃描")
      machine.enterUnloadMode(unloadModeType.value)
      unloadMaterialValue.value = ""
      nextTick(() => {
        if (isForceUnloadSlotPhase.value) focusUnloadSlotInput()
        else focusUnloadMaterialInput()
      })
      return
    }

    const correctState = await resolveReplacementCorrectState(materialPackCode, targetSlotIdno)

    unloadMaterialValue.value = ""
    if (!correctState) {
      focusUnloadMaterialInput()
      return
    }

    replacementCorrectState.value = correctState
    machine.onReplacementMaterialScanned(materialPackCode)
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
    if (!slotIdno) {
      showError("請輸入站位")
      focusUnloadSlotInput()
      return
    }

    if (handleModeTriggerFromUnloadInput(slotIdno.toUpperCase())) return
    if (isForceUnloadSlotPhase.value) { void handleForceUnloadSlotSubmit(slotIdno); return }
    if (!isReplaceSlotPhase.value) { focusUnloadSlotInput(); return }

    // Replace slot scan phase
    const targetSlotIdno = resolvedUnloadSlotIdno.value.trim()
    const parsedInput = parseFujiSlotIdno(slotIdno)
    const parsedTarget = parseFujiSlotIdno(targetSlotIdno)

    if (!parsedInput || !parsedTarget ||
      parsedInput.slot !== parsedTarget.slot ||
      parsedInput.stage !== parsedTarget.stage) {
      showError(`請掃描原卸料站位 ${targetSlotIdno}`)
      unloadSlotValue.value = ""
      focusUnloadSlotInput()
      return
    }

    const replacementPackCode = replacementMaterialPackCode.value.trim()
    const correctState = replacementCorrectState.value
    if (!replacementPackCode || !correctState) {
      showError("找不到更換捲號，請重新掃描")
      machine.enterUnloadMode(unloadModeType.value)
      focusUnloadMaterialInput()
      return
    }

    const row = findRowBySlotIdno(targetSlotIdno)
    if (!row) {
      showError(`找不到槽位 ${targetSlotIdno}`)
      machine.enterUnloadMode(unloadModeType.value)
      focusUnloadMaterialInput()
      return
    }

    row.materialInventoryIdno = replacementPackCode
    row.correct = correctState
    row.operatorIdno = currentUsername.value || null
    if (correctState === "TESTING_MATERIAL_PACK") {
      row.remark = "[測試模式綁定]"
    }
    updateRowInGrid(row)

    pendingSpliceRecords.value = [
      ...pendingSpliceRecords.value,
      {
        slot: parsedTarget.slot,
        stage: parsedTarget.stage,
        materialPackCode: replacementPackCode,
        correctState,
        operationTime: new Date().toISOString(),
      },
    ]
    persistNow()

    unloadSlotValue.value = ""
    machine.onReplaceSlotSubmitted()
    replacementCorrectState.value = null
    focusMaterialInput()
  }

  // ── Upload callbacks ───────────────────────────────────────────

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

  // ── Return ─────────────────────────────────────────────────────

  return {
    // Mode state
    isUnloadMode,
    isIpqcMode,
    unloadModeType,
    // Machine-sourced state
    isUnloadScanPhase,
    isForceUnloadSlotPhase,
    isReplaceMaterialPhase,
    isReplaceSlotPhase,
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
    // Handlers
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
  }
}
