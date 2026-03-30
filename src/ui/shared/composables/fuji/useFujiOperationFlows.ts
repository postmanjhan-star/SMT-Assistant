/* eslint-disable no-restricted-imports -- [Phase-1 whitelist] tracked in REFACTORING_BASELINE.md, fix in Phase 3 */
import { computed, nextTick, ref } from 'vue'
import type { GridApi } from 'ag-grid-community'
import type { Ref } from 'vue'

// GridApi has private class members that break Ref<T> assignability, so we
// use a structural Pick of only the methods we actually call.
type FujiGridApi = Pick<GridApi, 'setRowData' | 'applyTransaction'>
import { CheckMaterialMatchEnum, SmtService } from '@/client'
import type { FujiMounterItemStatRead } from '@/client'
import { resolveMaterialLookupError } from '@/domain/material/MaterialLookupError'
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
} from '@/domain/mounter/operationModes'
import { parseFujiSlotIdno } from '@/domain/slot/FujiSlotParser'
import { isFujiStatSlotMatch } from '@/domain/production/buildFujiProductionRowData'
import type { FujiProductionRowModel } from '@/domain/production/buildFujiProductionRowData'
import { useOperationModeStateMachine } from '@/ui/shared/composables/useOperationModeStateMachine'
import { msg } from '@/ui/shared/messageCatalog'
import type { UnloadModeType } from '@/ui/shared/composables/useOperationModeStateMachine'

// ────────────────────────────────────────────────────────────────
// Options
// ────────────────────────────────────────────────────────────────

export type FujiOperationFlowsOptions = {
  // Grid
  getGridApi: () => FujiGridApi | null
  getColumnApi?: () => Pick<import('ag-grid-community').ColumnApi, 'setColumnVisible'> | null
  // Data
  rowData: Ref<FujiProductionRowModel[]>
  mounterData: Ref<FujiMounterItemStatRead[]>
  // Mode
  isTestingMode: Ref<boolean>
  isMockMode: boolean
  currentUsername?: () => string | null
  // UI callbacks
  showError: (msg: string) => void
  showSuccess: (msg: string) => void
  handleUserSwitchTrigger: (code: string) => boolean
  clearNormalScanState: () => void
  focusMaterialInput: () => void
  // DOM refs
  getUnloadMaterialInputRef: () => HTMLInputElement | null
  getUnloadSlotInputRef: () => HTMLInputElement | null
  // API functions (from useFujiProductionWorkflow)
  submitUnload: (params: { materialPackCode: string; slotIdno: string; unfeedReason?: string | null }) => Promise<boolean>
  submitForceUnloadBySlot: (params: { slotIdno: string; unfeedReason?: string | null }) => Promise<{ ok: boolean; slotIdno?: string }>
  findUniqueUnloadSlotByPackCode: (materialPackCode: string) => { ok: true; slotIdno: string } | { ok: false; error: string }
  validateUnloadMaterialPackCode: (code: string) => Promise<boolean>
  validateReplacementMaterialForSlot: (params: { materialPackCode: string; slotIdno: string }) => Promise<boolean>
  submitReplace: (params: { materialPackCode: string; slotIdno: string }) => Promise<boolean>
  inspectionUpload: (params: {
    stat_id: number
    inputSlot: string
    inputSubSlot: string
    materialInventory: { idno: string }
  }) => Promise<void>
  applyInspectionUpdate: (mounter: string, stage: string | null, slot: number | null, materialIdno: string) => void
}

// ────────────────────────────────────────────────────────────────
// Composable
// ────────────────────────────────────────────────────────────────

export function useFujiOperationFlows(options: FujiOperationFlowsOptions) {
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

  // ── Input values (v-model) ────────────────────────────────────
  const unloadMaterialValue = ref("")
  const unloadSlotValue = ref("")
  const ipqcMaterialValue = ref("")
  const ipqcSlotValue = ref("")

  // ── Input DOM refs ────────────────────────────────────────────
  const unloadMaterialInput = ref<HTMLInputElement | null>(null)
  const unloadSlotInput = ref<HTMLInputElement | null>(null)
  const ipqcMaterialInput = ref<HTMLInputElement | null>(null)
  const ipqcSlotInput = ref<HTMLInputElement | null>(null)

  // ── IPQC saved states ─────────────────────────────────────────
  const ipqcSavedCorrectStates = ref<Map<string, unknown>>(new Map())

  // ── UI helper computeds ───────────────────────────────────────

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

  // ── Focus helpers ─────────────────────────────────────────────

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

  // ── Slot helpers ──────────────────────────────────────────────

  function toCanonicalFujiSlot(raw: string): string | null {
    const parsed = parseFujiSlotIdno(raw)
    if (!parsed) return null
    return `${parsed.machineIdno}-${parsed.stage}-${parsed.slot}`
  }

  function parseAppendedCodes(value: string | null | undefined): string[] {
    if (!value) return []
    return value.split(",").map((s) => s.trim()).filter(Boolean)
  }

  function getCurrentPackCode(row: FujiProductionRowModel): string {
    const appended = parseAppendedCodes(row.appendedMaterialInventoryIdno)
    if (appended.length > 0) return appended[appended.length - 1]
    return String(row.materialInventoryIdno ?? "").trim()
  }

  function findRowBySlotIdno(slotIdno: string): FujiProductionRowModel | undefined {
    const parsed = parseFujiSlotIdno(slotIdno)
    if (!parsed) return undefined
    return (options.rowData.value ?? []).find(
      (row) =>
        Number(row.slot) === parsed.slot &&
        String(row.stage).trim() === String(parsed.stage).trim()
    )
  }

  // ── Duplicate detection ───────────────────────────────────────

  function isBarcodeAlreadyInGrid(barcode: string): boolean {
    return options.rowData.value.some((row) => {
      if (String(row.materialInventoryIdno ?? "").trim() === barcode) return true
      const appended = String(row.appendedMaterialInventoryIdno ?? "").trim()
      return appended.split(",").some((c) => c.trim() === barcode)
    })
  }

  // ── Column toggle ─────────────────────────────────────────────

  const NORMAL_COLS = ["materialInventoryIdno", "operatorIdno", "operationTime"]
  const IPQC_COLS   = ["inspectMaterialPackCode", "inspectTime", "inspectorIdno", "inspectCount"]

  function toggleIpqcColumns(entering: boolean) {
    const api = options.getColumnApi?.()
    if (!api) return
    IPQC_COLS.forEach(col   => { try { api.setColumnVisible(col, entering)  } catch { /* no-op */ } })
    NORMAL_COLS.forEach(col => { try { api.setColumnVisible(col, !entering) } catch { /* no-op */ } })
  }

  // ── Mode entry/exit ───────────────────────────────────────────

  function _enterUnloadMode(modeType: UnloadModeType) {
    machine.enterUnloadMode(modeType)
    options.clearNormalScanState()
    nextTick(() => {
      if (modeType === "force_single_slot") {
        focusUnloadSlotInput()
      } else {
        focusUnloadMaterialInput()
      }
    })
  }

  function handleExitUnloadMode() {
    machine.exitToNormal()
    unloadMaterialValue.value = ""
    unloadSlotValue.value = ""
    options.focusMaterialInput()
  }

  function enterIpqcMode() {
    machine.enterIpqcMode()
    options.clearNormalScanState()

    const saved = new Map<string, unknown>()
    for (const row of options.rowData.value) {
      const key = `${row.mounterIdno}-${row.stage}-${row.slot}`
      saved.set(key, row.correct)
      ;(row as any).correct = "UNLOADED_MATERIAL_PACK"
    }
    ipqcSavedCorrectStates.value = saved

    const gridApi = options.getGridApi()
    if (gridApi) {
      gridApi.setRowData(options.rowData.value as any)
    }

    toggleIpqcColumns(true)
    focusIpqcMaterialInput()
  }

  function exitIpqcMode() {
    machine.exitToNormal()
    for (const row of options.rowData.value) {
      const key = `${row.mounterIdno}-${row.stage}-${row.slot}`
      const saved = ipqcSavedCorrectStates.value.get(key)
      if (saved !== undefined) {
        ;(row as any).correct = saved
      }
    }
    ipqcSavedCorrectStates.value.clear()

    const gridApi = options.getGridApi()
    if (gridApi) {
      gridApi.setRowData(options.rowData.value as any)
    }

    toggleIpqcColumns(false)
    ipqcMaterialValue.value = ""
    ipqcSlotValue.value = ""
    options.focusMaterialInput()
  }

  // ── IPQC validation ───────────────────────────────────────────

  async function validateIpqcMaterialPackCode(materialPackCode: string): Promise<boolean> {
    const trimmed = materialPackCode.trim()
    if (!trimmed) {
      options.showError("請先輸入物料條碼")
      return false
    }
    if (options.isTestingMode.value || options.isMockMode) return true
    try {
      await SmtService.getMaterialInventoryForSmt({ materialInventoryIdno: trimmed })
      return true
    } catch (error) {
      options.showError(resolveMaterialLookupError(error))
      return false
    }
  }

  // ── IPQC handlers ─────────────────────────────────────────────

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
      options.handleUserSwitchTrigger(code)
      ipqcMaterialValue.value = ""
      return
    }
    if (code === MATERIAL_UNLOAD_TRIGGER || code === MATERIAL_FORCE_UNLOAD_TRIGGER) {
      exitIpqcMode()
      ipqcMaterialValue.value = ""
      const modeType: UnloadModeType = code === MATERIAL_FORCE_UNLOAD_TRIGGER
        ? "force_single_slot"
        : "pack_auto_slot"
      _enterUnloadMode(modeType)
      return
    }

    const isValid = await validateIpqcMaterialPackCode(materialPackCode)
    if (!isValid) {
      ipqcMaterialValue.value = ""
      focusIpqcMaterialInput()
      return
    }

    ipqcMaterialValue.value = materialPackCode
    options.showSuccess(msg.ipqc.materialScanned(materialPackCode))
    focusIpqcSlotInput()
  }

  async function handleIpqcSlotSubmit() {
    const slotIdno = ipqcSlotValue.value.trim()
    if (!slotIdno) return

    const code = slotIdno.toUpperCase()
    if (code === MATERIAL_EXIT_TRIGGER || code === MATERIAL_IPQC_TRIGGER) {
      exitIpqcMode()
      ipqcSlotValue.value = ""
      return
    }

    const materialPackCode = ipqcMaterialValue.value.trim()
    const parsed = parseFujiSlotIdno(slotIdno)
    if (!parsed) {
      options.showError(`槽位格式錯誤: ${slotIdno}`)
      ipqcSlotValue.value = ""
      focusIpqcSlotInput()
      return
    }

    const row = findRowBySlotIdno(slotIdno)
    if (!row) {
      options.showError(`找不到槽位 ${slotIdno}`)
      ipqcSlotValue.value = ""
      focusIpqcSlotInput()
      return
    }

    const currentPackCode = getCurrentPackCode(row)
    if (materialPackCode !== currentPackCode) {
      options.showError(`料號不符：掃描 ${materialPackCode}，槽位應為 ${currentPackCode}`)
      ipqcSlotValue.value = ""
      ipqcMaterialValue.value = ""
      focusIpqcMaterialInput()
      return
    }

    const statItem = options.mounterData.value.find((s) =>
      isFujiStatSlotMatch(s, parsed.slot, parsed.stage)
    )

    if (statItem) {
      try {
        await options.inspectionUpload({
          stat_id: statItem.id,
          inputSlot: String(parsed.slot),
          inputSubSlot: parsed.stage,
          materialInventory: { idno: materialPackCode },
        })
        options.applyInspectionUpdate(parsed.machineIdno, parsed.stage, parsed.slot, materialPackCode)
      } catch (error) {
        options.showError("巡檢上傳失敗")
        console.error(error)
      }
    }

    ;(row as any).correct = CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK
    ;(row as any).inspectorIdno = options.currentUsername?.() ?? null
    const gridApi = options.getGridApi()
    if (gridApi) {
      gridApi.applyTransaction?.({ update: [row] })
    }

    options.showSuccess(msg.ipqc.inspectionSuccess(materialPackCode, slotIdno))
    ipqcSlotValue.value = ""
    ipqcMaterialValue.value = ""
    focusIpqcMaterialInput()
  }

  // ── Mode trigger handlers ─────────────────────────────────────

  function handleModeTriggerFromUnloadInput(code: string): boolean {
    if (code === MATERIAL_IPQC_TRIGGER) {
      handleExitUnloadMode()
      enterIpqcMode()
      return true
    }
    if (code === MATERIAL_EXIT_TRIGGER) {
      handleExitUnloadMode()
      return true
    }
    if (code === MATERIAL_UNLOAD_TRIGGER || code === MATERIAL_FORCE_UNLOAD_TRIGGER) {
      handleExitUnloadMode()
      return true
    }
    return false
  }

  function handleBeforeMaterialScan(barcode: string): boolean {
    const trimmed = barcode.trim()
    const code = trimmed.toUpperCase()
    if (options.handleUserSwitchTrigger(code)) return false
    if (code === MATERIAL_UNLOAD_TRIGGER) {
      _enterUnloadMode("pack_auto_slot")
      return false
    }
    if (code === MATERIAL_FORCE_UNLOAD_TRIGGER) {
      _enterUnloadMode("force_single_slot")
      return false
    }
    if (code === MATERIAL_IPQC_TRIGGER) {
      isIpqcMode.value ? exitIpqcMode() : enterIpqcMode()
      return false
    }
    if (code === MATERIAL_EXIT_TRIGGER && isIpqcMode.value) {
      exitIpqcMode()
      return false
    }
    if (!isIpqcMode.value && isBarcodeAlreadyInGrid(trimmed)) {
      options.showError("重複掃描：此條碼已存在於目前站位資料")
      return false
    }
    return true
  }

  async function handleBeforeSlotSubmit(raw: string): Promise<boolean> {
    const code = raw.trim().toUpperCase()
    if (code === MATERIAL_UNLOAD_TRIGGER) {
      _enterUnloadMode("pack_auto_slot")
      return false
    }
    if (code === MATERIAL_FORCE_UNLOAD_TRIGGER) {
      _enterUnloadMode("force_single_slot")
      return false
    }
    if (code === MATERIAL_IPQC_TRIGGER) {
      isIpqcMode.value ? exitIpqcMode() : enterIpqcMode()
      return false
    }
    if (code === MATERIAL_EXIT_TRIGGER && isIpqcMode.value) {
      exitIpqcMode()
      return false
    }
    return true
  }

  // ── Unload workflow handlers ──────────────────────────────────

  async function handleUnloadMaterialSubmit(materialPackCode: string) {
    const resolved = options.findUniqueUnloadSlotByPackCode(materialPackCode)
    if (resolved.ok === false) {
      options.showError(resolved.error)
      unloadMaterialValue.value = ""
      focusUnloadMaterialInput()
      return
    }

    const isValidPackCode = options.isMockMode || await options.validateUnloadMaterialPackCode(materialPackCode)
    if (!isValidPackCode) {
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
      options.showError("找不到卸料站位，請重新掃描")
      machine.exitToNormal()
      unloadMaterialValue.value = ""
      return
    }

    const canReplace = options.isMockMode || await options.validateReplacementMaterialForSlot({
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

    if (isUnloadScanPhase.value) {
      void handleUnloadMaterialSubmit(material)
      return
    }

    if (isReplaceMaterialPhase.value) {
      void handleReplacementMaterialSubmit(material)
    }
  }

  async function handleUnloadSlotSubmit() {
    if (!isUnloadMode.value) return

    const slotIdno = unloadSlotValue.value.trim()
    const slotCommand = slotIdno.toUpperCase()
    const targetSlotIdno = resolvedUnloadSlotIdno.value.trim()
    const replacementPackCode = replacementMaterialPackCode.value.trim()

    if (!slotIdno) {
      options.showError("請輸入槽位")
      focusUnloadSlotInput()
      return
    }

    if (handleModeTriggerFromUnloadInput(slotCommand)) return

    if (isForceUnloadSlotPhase.value) {
      void handleForceUnloadSlotSubmit(slotIdno)
      return
    }

    if (!isReplaceSlotPhase.value) {
      focusUnloadSlotInput()
      return
    }

    const normalizedInput = toCanonicalFujiSlot(slotIdno)
    const normalizedTarget = toCanonicalFujiSlot(targetSlotIdno)
    if (!normalizedInput || !normalizedTarget || normalizedInput !== normalizedTarget) {
      options.showError(`請掃描原卸料站位 ${targetSlotIdno}`)
      unloadSlotValue.value = ""
      focusUnloadSlotInput()
      return
    }

    if (!replacementPackCode) {
      options.showError("找不到更換捲號，請重新掃描")
      machine.exitToNormal()
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

    machine.onReplaceSlotSubmitted()
    options.focusMaterialInput()
  }

  // ── Return ────────────────────────────────────────────────────

  return {
    // Machine state
    isUnloadMode,
    isIpqcMode,
    isUnloadScanPhase,
    isForceUnloadSlotPhase,
    isReplaceMaterialPhase,
    isReplaceSlotPhase,
    unloadModeType,
    // UI helpers
    operationModeName,
    unloadMaterialLabel,
    unloadMaterialPlaceholder,
    hasUnloadMaterial,
    isUnloadMaterialInputDisabled,
    isUnloadSlotInputDisabled,
    unloadSlotLabel,
    unloadSlotPlaceholder,
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
    // Handlers
    handleBeforeMaterialScan,
    handleBeforeSlotSubmit,
    handleUnloadMaterialEnter,
    handleUnloadSlotSubmit,
    handleIpqcMaterialSubmit,
    handleIpqcSlotSubmit,
    handleExitUnloadMode,
    exitIpqcMode,
  }
}
