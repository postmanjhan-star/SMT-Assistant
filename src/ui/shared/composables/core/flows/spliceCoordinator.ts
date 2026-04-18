import { nextTick, ref, type Ref } from "vue"
import {
  MATERIAL_FORCE_UNLOAD_TRIGGER,
  MATERIAL_IPQC_TRIGGER,
  MATERIAL_SPLICE_TRIGGER,
  MATERIAL_UNLOAD_TRIGGER,
} from "@/domain/mounter/operationModes"
import type { MounterOperationFlowsAdapter, OperationFlowRow } from "../MounterOperationFlowsAdapter"
import { CORRECT_STATE } from "./materialPackCodeHelpers"

export type SpliceCoordinatorDeps<TRow extends OperationFlowRow = OperationFlowRow> = {
  machine: {
    enterSpliceMode: () => void
    exitToNormal: () => void
    onSpliceCurrentScanned: (slotIdno: string) => void
    onSpliceNewScanned: (code: string) => void
    onSpliceSlotSubmitted: () => void
  }
  adapter: Pick<
    MounterOperationFlowsAdapter<TRow>,
    "toRowKey" | "toRowSlotIdno" | "slotsMatch" | "buildSpliceRecord"
  >
  rowData: Ref<TRow[]>
  currentUsername: Ref<string | null> | { value: string | null }
  pendingSpliceRecords: Ref<unknown[]>
  spliceSlotIdno: Ref<string>
  spliceNewPackCode: Ref<string>
  findUniqueUnloadSlotByPackCode: (
    code: string,
  ) => { ok: true; row: TRow; slotIdno: string } | { ok: false; error: string }
  validateUnloadMaterialPackCode: (code: string) => Promise<boolean>
  resolveReplacementCorrectState: (code: string, slot: string) => Promise<string | null>
  findRowBySlotIdno: (slot: string) => TRow | null
  updateRowInGrid: (row: TRow) => void
  showError: (msg: string) => void
  clearNormalScanState: () => void
  focusMaterialInput: () => void
  persistNow: () => void
  handleUserSwitchTrigger: (code: string) => boolean
  enterIpqcMode: () => void
  enterUnloadMode: (type: "pack_auto_slot" | "force_single_slot") => void
}

export function createSpliceCoordinator<TRow extends OperationFlowRow = OperationFlowRow>(deps: SpliceCoordinatorDeps<TRow>) {
  const {
    machine, adapter, rowData, currentUsername, pendingSpliceRecords,
    spliceSlotIdno, spliceNewPackCode,
    findUniqueUnloadSlotByPackCode, validateUnloadMaterialPackCode,
    resolveReplacementCorrectState, findRowBySlotIdno, updateRowInGrid,
    showError, clearNormalScanState, focusMaterialInput, persistNow,
    handleUserSwitchTrigger, enterIpqcMode, enterUnloadMode,
  } = deps

  const spliceSavedCorrectState = ref<{ rowKey: string; correct: string | null | undefined } | null>(null)
  const spliceMaterialValue = ref("")
  const spliceSlotValue     = ref("")
  const spliceMaterialInput = ref<HTMLInputElement | null>(null)
  const spliceSlotInput     = ref<HTMLInputElement | null>(null)

  function focusSpliceMaterialInput() {
    nextTick(() => { spliceMaterialInput.value?.focus() })
  }

  function focusSpliceSlotInput() {
    nextTick(() => { spliceSlotInput.value?.focus() })
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
      const row = (rowData.value ?? []).find((r) => adapter.toRowKey(r) === saved.rowKey)
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
    if (resolved.ok === false) {
      showError(resolved.error)
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

    pendingSpliceRecords.value = [
      ...pendingSpliceRecords.value,
      adapter.buildSpliceRecord(row, {
        materialPackCode: newPackCode,
        correctState,
        operationTime: new Date().toISOString(),
      }),
    ]
    persistNow()

    machine.onSpliceSlotSubmitted()
    spliceSavedCorrectState.value = null
    spliceSlotValue.value = ""
    focusSpliceMaterialInput()
  }

  return {
    spliceSavedCorrectState,
    spliceMaterialValue,
    spliceSlotValue,
    spliceMaterialInput,
    spliceSlotInput,
    focusSpliceMaterialInput,
    focusSpliceSlotInput,
    enterSpliceMode,
    exitSpliceMode,
    handleModeTriggerFromSpliceInput,
    handleSpliceCurrentScan,
    handleSpliceNewScan,
    handleSpliceSlotSubmit,
  }
}

export type SpliceCoordinator = ReturnType<typeof createSpliceCoordinator>
