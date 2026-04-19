import { computed, nextTick, ref, type ComputedRef, type Ref } from "vue"
import { CheckMaterialMatchEnum } from "@/application/post-production-feed/clientTypes"
import {
  MATERIAL_FORCE_UNLOAD_TRIGGER,
  MATERIAL_IPQC_TRIGGER,
  MATERIAL_SPLICE_TRIGGER,
  MATERIAL_UNLOAD_TRIGGER,
} from "@/domain/mounter/operationModes"
import type { MounterOperationFlowsAdapter, OperationFlowRow } from "../MounterOperationFlowsAdapter"
import { CORRECT_STATE } from "./materialPackCodeHelpers"

export type UnloadReplaceCoordinatorDeps<TRow extends OperationFlowRow = OperationFlowRow> = {
  machine: {
    enterUnloadMode: (type: "pack_auto_slot" | "force_single_slot") => void
    exitToNormal: () => void
    onUnloadSubmitted: (slotIdno: string) => void
    onForceUnloadSubmitted: (slotIdno: string) => void
    onReplacementMaterialScanned: (code: string) => void
    onReplaceSlotSubmitted: () => void
  }
  isUnloadMode: ComputedRef<boolean> | Ref<boolean>
  isUnloadScanPhase: ComputedRef<boolean> | Ref<boolean>
  isForceUnloadSlotPhase: ComputedRef<boolean> | Ref<boolean>
  isReplaceMaterialPhase: ComputedRef<boolean> | Ref<boolean>
  isReplaceSlotPhase: ComputedRef<boolean> | Ref<boolean>
  unloadModeType: Ref<"pack_auto_slot" | "force_single_slot">
  resolvedUnloadSlotIdno: Ref<string>
  replacementMaterialPackCode: Ref<string>

  adapter: Pick<
    MounterOperationFlowsAdapter<TRow>,
    "applyGridTransaction" | "toRowSlotIdno" | "slotsMatch" | "buildUnloadRecord" | "buildSpliceRecord"
  >
  rowData: Ref<TRow[]>
  currentUsername: Ref<string | null> | { value: string | null }
  pendingUnloadRecords: Ref<unknown[]>
  pendingSpliceRecords: Ref<unknown[]>

  getLoadedPackCode: (row: TRow) => string
  getSplicePackCode: (row: TRow) => string
  getForceUnloadPackCode: (row: TRow) => string | null
  findUniqueUnloadSlotByPackCode: (
    code: string,
  ) => { ok: true; row: TRow; slotIdno: string } | { ok: false; error: string }
  resolveReplacementCorrectState: (code: string, slot: string) => Promise<string | null>
  findRowBySlotIdno: (slot: string) => TRow | null
  updateRowInGrid: (row: TRow) => void
  showError: (msg: string) => void
  clearNormalScanState: () => void
  focusMaterialInput: () => void
  persistNow: () => void

  enterIpqcMode: () => void
  enterSpliceMode: () => void
}

export function createUnloadReplaceCoordinator<TRow extends OperationFlowRow = OperationFlowRow>(deps: UnloadReplaceCoordinatorDeps<TRow>) {
  const {
    machine, adapter, rowData, currentUsername,
    pendingUnloadRecords, pendingSpliceRecords,
    isUnloadMode, isUnloadScanPhase, isForceUnloadSlotPhase,
    isReplaceMaterialPhase, isReplaceSlotPhase,
    unloadModeType, resolvedUnloadSlotIdno, replacementMaterialPackCode,
    getLoadedPackCode, getSplicePackCode, getForceUnloadPackCode,
    findUniqueUnloadSlotByPackCode, resolveReplacementCorrectState,
    findRowBySlotIdno, updateRowInGrid, showError,
    clearNormalScanState, focusMaterialInput, persistNow,
    enterIpqcMode, enterSpliceMode,
  } = deps

  const replacementCorrectState = ref<string | null>(null)

  const unloadMaterialValue = ref("")
  const unloadSlotValue     = ref("")

  const unloadMaterialInput = ref<HTMLInputElement | null>(null)
  const unloadSlotInput     = ref<HTMLInputElement | null>(null)

  // ── UI computeds ──────────────────────────────────────────────────────────

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

  // ── applyUnloadToRow ──────────────────────────────────────────────────────

  function applyUnloadToRow(row: TRow, materialPackCode: string) {
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

  // ── Mode control ──────────────────────────────────────────────────────────

  function enterUnloadMode(modeType: "pack_auto_slot" | "force_single_slot") {
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

  // ── Mode trigger ──────────────────────────────────────────────────────────

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

  // ── Push helpers ──────────────────────────────────────────────────────────

  function pushUnloadRecord(record: unknown) {
    pendingUnloadRecords.value = [...pendingUnloadRecords.value, record]
    persistNow()
  }

  function pushSpliceRecord(record: unknown) {
    pendingSpliceRecords.value = [...pendingSpliceRecords.value, record]
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleUnloadMaterialSubmit(materialPackCode: string) {
    const resolved = findUniqueUnloadSlotByPackCode(materialPackCode)
    if (resolved.ok === false) {
      showError(resolved.error)
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

  function onUnloadUploaded(ok: boolean) {
    if (!ok) return
    pendingUnloadRecords.value = []
    persistNow()
  }

  return {
    // State
    replacementCorrectState,
    unloadMaterialValue,
    unloadSlotValue,
    unloadMaterialInput,
    unloadSlotInput,
    // UI computeds
    unloadMaterialLabel,
    unloadMaterialPlaceholder,
    hasUnloadMaterial,
    isUnloadMaterialInputDisabled,
    isUnloadSlotInputDisabled,
    unloadSlotLabel,
    unloadSlotPlaceholder,
    // Focus
    focusUnloadMaterialInput,
    focusUnloadSlotInput,
    focusByCurrentPhase,
    // Helpers
    applyUnloadToRow,
    // Mode control
    enterUnloadMode,
    exitUnloadMode,
    handleModeTriggerFromUnloadInput,
    // Handlers
    handleUnloadMaterialSubmit,
    handleForceUnloadSlotSubmit,
    handleReplacementMaterialSubmit,
    handleUnloadMaterialEnter,
    handleUnloadSlotSubmit,
    onUnloadUploaded,
  }
}

export type UnloadReplaceCoordinator = ReturnType<typeof createUnloadReplaceCoordinator>
