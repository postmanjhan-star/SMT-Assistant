import { computed, nextTick, ref } from "vue"
import { CheckMaterialMatchEnum } from "@/client"
import { removeMaterialCode } from "@/domain/production/PostProductionFeedRules"
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
  USER_SWITCH_TRIGGER,
} from "@/domain/mounter/operationModes"
import { useOperationModeStateMachine } from "@/ui/shared/composables/useOperationModeStateMachine"
import type { MounterOperationFlowsAdapter, MounterOperationFlowsCoreOptions } from "./MounterOperationFlowsAdapter"
import { CORRECT_STATE, createMaterialPackCodeHelpers } from "./flows/materialPackCodeHelpers"
import { createMaterialValidator } from "./flows/materialValidator"

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

  const replacementCorrectState = ref<string | null>(null)
  const spliceSavedCorrectState = ref<{ rowKey: string; correct: unknown } | null>(null)
  const ipqcCheckPackCodeMatch  = ref<CheckMaterialMatchEnum | null>(null)

  // ── Input values（v-model） ──────────────────────────────────────────────

  const unloadMaterialValue  = ref("")
  const unloadSlotValue      = ref("")
  const ipqcMaterialValue    = ref("")
  const ipqcSlotValue        = ref("")
  const spliceMaterialValue  = ref("")
  const spliceSlotValue      = ref("")

  // ── Input DOM refs（:ref binding） ──────────────────────────────────────

  const unloadMaterialInput = ref<HTMLInputElement | null>(null)
  const unloadSlotInput     = ref<HTMLInputElement | null>(null)
  const ipqcMaterialInput   = ref<HTMLInputElement | null>(null)
  const ipqcSlotInput       = ref<HTMLInputElement | null>(null)
  const spliceMaterialInput = ref<HTMLInputElement | null>(null)
  const spliceSlotInput     = ref<HTMLInputElement | null>(null)

  const ipqcSavedCorrectStates = ref<Map<string, unknown>>(new Map())

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

  // ── UI helper computeds ───────────────────────────────────────────────────

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

  // ── Grid helpers ──────────────────────────────────────────────────────────

  function updateRowInGrid(row: any) {
    try {
      adapter.applyGridTransaction([row])
    } catch {
      // Grid might not be ready
    }
  }

  function applyUnloadToRow(row: any, materialPackCode: string) {
    const loadedPackCode = getLoadedPackCode(row)
    const splicePackCode = getSplicePackCode(row)

    if (splicePackCode && splicePackCode === materialPackCode) {
      row.spliceMaterialInventoryIdno = ""
      row.correct = loadedPackCode ? CORRECT_STATE.MATCHED : CORRECT_STATE.UNLOADED
    } else if (splicePackCode) {
      row.appendedMaterialInventoryIdno = row.spliceMaterialInventoryIdno
      row.spliceMaterialInventoryIdno = ""
      row.correct = CORRECT_STATE.MATCHED
    } else {
      row.appendedMaterialInventoryIdno = ""
      row.correct = CORRECT_STATE.UNLOADED
    }
    updateRowInGrid(row)
  }

  // ── Row search helpers ────────────────────────────────────────────────────

  function findRowBySlotIdno(slotIdno: string): any | null {
    return adapter.findRowBySlotInput(slotIdno, rowData.value)
  }

  // ── IPQC columns ──────────────────────────────────────────────────────────

  function showIpqcColumns(visible: boolean) {
    adapter.setColumnVisible("inspectMaterialPackCode", visible)
    adapter.setColumnVisible("inspectTime", visible)
    adapter.setColumnVisible("inspectCount", visible)
    adapter.setColumnVisible("inspectorIdno", visible)
    adapter.toggleNormalColumnsForIpqc?.(visible)
  }

  // ── Focus helpers ─────────────────────────────────────────────────────────

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

  function focusSpliceMaterialInput() {
    nextTick(() => { spliceMaterialInput.value?.focus() })
  }

  function focusSpliceSlotInput() {
    nextTick(() => { spliceSlotInput.value?.focus() })
  }

  // ── Mode control ──────────────────────────────────────────────────────────

  function enterUnloadMode(modeType: Parameters<typeof machine.enterUnloadMode>[0]) {
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
    ipqcCheckPackCodeMatch.value = null
    clearNormalScanState()

    const saved = new Map<string, unknown>()
    for (const row of rowData.value) {
      const key = adapter.toRowKey(row)
      saved.set(key, row.correct)
      row.correct = CORRECT_STATE.UNLOADED
      updateRowInGrid(row)
    }
    ipqcSavedCorrectStates.value = saved

    showIpqcColumns(true)
    focusIpqcMaterialInput()
  }

  function exitIpqcMode() {
    machine.exitToNormal()
    ipqcCheckPackCodeMatch.value = null
    for (const row of rowData.value) {
      const key = adapter.toRowKey(row)
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

  function enterSpliceMode() {
    machine.enterSpliceMode()
    spliceSavedCorrectState.value = null
    spliceMaterialValue.value = ""
    spliceSlotValue.value = ""
    clearNormalScanState()
    nextTick(() => focusSpliceMaterialInput())
  }

  function exitSpliceMode() {
    if (spliceSavedCorrectState.value) {
      const saved = spliceSavedCorrectState.value
      const row = (rowData.value ?? []).find((r: any) => adapter.toRowKey(r) === saved.rowKey)
      if (row) {
        row.correct = saved.correct
        updateRowInGrid(row)
      }
      spliceSavedCorrectState.value = null
    }
    spliceMaterialValue.value = ""
    spliceSlotValue.value = ""
    machine.exitToNormal()
    focusMaterialInput()
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

  // ── IPQC handlers ─────────────────────────────────────────────────────────

  async function handleIpqcMaterialSubmit() {
    const materialPackCode = ipqcMaterialValue.value.trim()
    if (!materialPackCode) return

    const code = materialPackCode.toUpperCase()
    if (code === MATERIAL_IPQC_TRIGGER) {
      exitIpqcMode(); ipqcMaterialValue.value = ""; return
    }
    if (code === MATERIAL_SPLICE_TRIGGER) {
      exitIpqcMode(); enterSpliceMode(); ipqcMaterialValue.value = ""; return
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

    const checkPackCodeMatch = await resolveExistenceBasedCorrectState(materialPackCode)
    if (!checkPackCodeMatch) {
      ipqcMaterialValue.value = ""
      focusIpqcMaterialInput()
      return
    }

    ipqcCheckPackCodeMatch.value = checkPackCodeMatch
    ipqcMaterialValue.value = materialPackCode
    focusIpqcSlotInput()
  }

  function handleIpqcSlotSubmit() {
    const slotIdno = ipqcSlotValue.value.trim()
    if (!slotIdno) return

    const code = slotIdno.toUpperCase()
    if (code === MATERIAL_IPQC_TRIGGER) {
      exitIpqcMode(); ipqcSlotValue.value = ""; return
    }
    if (code === MATERIAL_SPLICE_TRIGGER) {
      exitIpqcMode(); enterSpliceMode(); ipqcSlotValue.value = ""; return
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

    row.correct = (ipqcCheckPackCodeMatch.value ?? CORRECT_STATE.MATCHED) as string
    row.inspectMaterialPackCode = materialPackCode
    row.inspectTime  = new Date().toISOString()
    row.inspectCount = (row.inspectCount ?? 0) + 1
    row.inspectorIdno = currentUsername.value || null
    updateRowInGrid(row)

    pendingIpqcRecords.value = [
      ...pendingIpqcRecords.value,
      adapter.buildIpqcRecord(row, {
        slotIdno,
        materialPackCode,
        inspectorIdno:  currentUsername.value || "",
        inspectionTime: new Date().toISOString(),
        checkPackCodeMatch: ipqcCheckPackCodeMatch.value,
      }),
    ]

    ipqcCheckPackCodeMatch.value = null
    ipqcSlotValue.value = ""
    ipqcMaterialValue.value = ""
    focusIpqcMaterialInput()
    persistNow()
  }

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

  function handleModeTriggerFromUnloadInput(code: string): boolean {
    if (code === MATERIAL_UNLOAD_TRIGGER) {
      if (unloadModeType.value === "pack_auto_slot") {
        exitUnloadMode()
      } else {
        exitUnloadMode()
        enterUnloadMode("pack_auto_slot")
      }
      return true
    }
    if (code === MATERIAL_FORCE_UNLOAD_TRIGGER) {
      if (unloadModeType.value === "force_single_slot") {
        exitUnloadMode()
      } else {
        exitUnloadMode()
        enterUnloadMode("force_single_slot")
      }
      return true
    }
    if (code === MATERIAL_IPQC_TRIGGER) {
      exitUnloadMode()
      enterIpqcMode()
      return true
    }
    if (code === MATERIAL_SPLICE_TRIGGER) {
      exitUnloadMode()
      enterSpliceMode()
      return true
    }
    return false
  }

  function handleModeTriggerFromSpliceInput(code: string): boolean {
    if (handleUserSwitchTrigger(code)) { exitSpliceMode(); return true }
    if (code === MATERIAL_SPLICE_TRIGGER) {
      exitSpliceMode()
      return true
    }
    if (code === MATERIAL_UNLOAD_TRIGGER) {
      exitSpliceMode(); enterUnloadMode("pack_auto_slot"); return true
    }
    if (code === MATERIAL_FORCE_UNLOAD_TRIGGER) {
      exitSpliceMode(); enterUnloadMode("force_single_slot"); return true
    }
    if (code === MATERIAL_IPQC_TRIGGER) {
      exitSpliceMode(); enterIpqcMode(); return true
    }
    return false
  }

  async function handleSpliceCurrentScan(barcode: string) {
    const resolved = findUniqueUnloadSlotByPackCode(barcode)
    if (!resolved.ok) {
      showError(resolved.error ?? "找不到對應槽位")
      focusSpliceMaterialInput()
      return
    }
    const row = resolved.row
    const slotIdno = adapter.toRowSlotIdno(row)

    if (row.spliceMaterialInventoryIdno) {
      showError(`此站位已有接料條碼，請先卸料後再接料`)
      focusSpliceMaterialInput()
      return
    }

    spliceSavedCorrectState.value = { rowKey: adapter.toRowKey(row), correct: row.correct }
    row.correct = CORRECT_STATE.UNLOADED
    updateRowInGrid(row)
    machine.onSpliceCurrentScanned(slotIdno)
    focusSpliceMaterialInput()
  }

  async function handleSpliceNewScan(barcode: string) {
    const isValid = await validateUnloadMaterialPackCode(barcode)
    if (!isValid) {
      focusSpliceMaterialInput()
      return
    }
    machine.onSpliceNewScanned(barcode)
    focusSpliceSlotInput()
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

  async function handleSpliceSlotSubmit(slotIdno: string) {
    const targetSlotIdno = spliceSlotIdno.value.trim()
    const newPackCode    = spliceNewPackCode.value.trim()

    if (!adapter.slotsMatch(slotIdno, targetSlotIdno)) {
      showError(`請掃描原接料站位 ${targetSlotIdno}`)
      return
    }

    const correctState = await resolveReplacementCorrectState(newPackCode, targetSlotIdno)
    if (!correctState) return

    const row = findRowBySlotIdno(targetSlotIdno)
    if (!row) {
      showError(`找不到槽位 ${targetSlotIdno}`)
      machine.exitToNormal()
      return
    }

    row.spliceMaterialInventoryIdno = newPackCode
    row.correct = correctState
    row.operatorIdno = currentUsername.value || null
    row.operationTime = new Date().toISOString()
    updateRowInGrid(row)

    pushSpliceRecord(adapter.buildSpliceRecord(row, {
      materialPackCode: newPackCode,
      correctState,
      operationTime: new Date().toISOString(),
    }))
    persistNow()

    machine.onSpliceSlotSubmitted()
    spliceSavedCorrectState.value = null
    spliceSlotValue.value = ""
    focusSpliceMaterialInput()
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

  // ── Unload workflow ───────────────────────────────────────────────────────

  function pushUnloadRecord(record: unknown) {
    pendingUnloadRecords.value = [...pendingUnloadRecords.value, record]
    persistNow()
  }

  function pushSpliceRecord(record: unknown) {
    pendingSpliceRecords.value = [...pendingSpliceRecords.value, record]
  }

  async function handleUnloadMaterialSubmit(materialPackCode: string) {
    const resolved = findUniqueUnloadSlotByPackCode(materialPackCode)
    if (!resolved.ok) {
      showError(resolved.error ?? "找不到對應槽位")
      unloadMaterialValue.value = ""
      focusUnloadMaterialInput()
      return
    }

    // UNFEED 不查 ERP：沿用同 barcode 的 splice record correctState，否則用 row.correct
    const spliceRecord = (pendingSpliceRecords.value as Array<{ materialPackCode: string; correctState: string }>)
      .find((r) => r.materialPackCode === materialPackCode)
    const checkPackCodeMatch = (
      spliceRecord ? spliceRecord.correctState : resolved.row.correct
    ) as CheckMaterialMatchEnum | null

    if (!checkPackCodeMatch) {
      showError("找不到對應物料驗證狀態，請重新確認")
      unloadMaterialValue.value = ""
      focusUnloadMaterialInput()
      return
    }

    pushUnloadRecord(adapter.buildUnloadRecord(resolved.row, {
      materialPackCode,
      unfeedReason:  "MATERIAL_FINISHED",
      operationTime: new Date().toISOString(),
      checkPackCodeMatch,
    }))

    applyUnloadToRow(resolved.row, materialPackCode)

    unloadMaterialValue.value = ""
    machine.onUnloadSubmitted(adapter.toRowSlotIdno(resolved.row))
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

    const materialPackCode = getForceUnloadPackCode(row)
    if (!materialPackCode) {
      showError(`槽位 ${slotIdno} 無可卸除料號`)
      unloadSlotValue.value = ""
      focusUnloadSlotInput()
      return
    }

    // UNFEED 不查 ERP：沿用同 barcode 的 splice record correctState，否則用 row.correct
    const spliceRecord = (pendingSpliceRecords.value as Array<{ materialPackCode: string; correctState: string }>)
      .find((r) => r.materialPackCode === materialPackCode)
    const checkPackCodeMatch = (
      spliceRecord ? spliceRecord.correctState : row.correct
    ) as CheckMaterialMatchEnum | null

    if (!checkPackCodeMatch) {
      showError("找不到對應物料驗證狀態，請重新確認")
      unloadSlotValue.value = ""
      focusUnloadSlotInput()
      return
    }

    pushUnloadRecord(adapter.buildUnloadRecord(row, {
      materialPackCode,
      unfeedReason:  "WRONG_MATERIAL",
      operationTime: new Date().toISOString(),
      checkPackCodeMatch,
    }))

    applyUnloadToRow(row, materialPackCode)

    unloadSlotValue.value = ""
    machine.onForceUnloadSubmitted(adapter.toRowSlotIdno(row))
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
    if (isUnloadScanPhase.value)    { void handleUnloadMaterialSubmit(material); return }
    if (isReplaceMaterialPhase.value) { void handleReplacementMaterialSubmit(material) }
  }

  async function handleUnloadSlotSubmit() {
    if (!isUnloadMode.value) return

    const slotIdno = unloadSlotValue.value.trim()
    if (!slotIdno) { showError("請輸入站位"); focusUnloadSlotInput(); return }

    if (handleModeTriggerFromUnloadInput(slotIdno.toUpperCase())) return
    if (isForceUnloadSlotPhase.value) { void handleForceUnloadSlotSubmit(slotIdno); return }
    if (!isReplaceSlotPhase.value)    { focusUnloadSlotInput(); return }

    // ── Replace slot phase ──────────────────────────────────────────────────

    const targetSlotIdno      = resolvedUnloadSlotIdno.value.trim()
    const replacementPackCode = replacementMaterialPackCode.value.trim()
    const correctState        = replacementCorrectState.value

    if (!adapter.slotsMatch(slotIdno, targetSlotIdno)) {
      showError(`請掃描原卸料站位 ${targetSlotIdno}`)
      unloadSlotValue.value = ""
      focusUnloadSlotInput()
      return
    }

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

    row.appendedMaterialInventoryIdno = replacementPackCode
    row.correct                       = correctState
    row.operatorIdno          = currentUsername.value || null
    row.operationTime         = new Date().toISOString()
    if (correctState === CORRECT_STATE.TESTING) {
      row.remark = "[測試模式綁定]"
    }
    updateRowInGrid(row)

    pushSpliceRecord(adapter.buildSpliceRecord(row, {
      materialPackCode: replacementPackCode,
      correctState,
      operationTime: new Date().toISOString(),
    }))
    persistNow()

    unloadSlotValue.value = ""
    machine.onReplaceSlotSubmitted()
    replacementCorrectState.value = null
    focusMaterialInput()
  }

  // ── Upload callbacks ──────────────────────────────────────────────────────

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
