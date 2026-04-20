import { nextTick, type Ref } from "vue"
import type { useOperationModeStateMachine } from "@/ui/shared/composables/useOperationModeStateMachine"
import type { MounterProductionOperationFlowsAdapter } from "../../MounterProductionOperationFlowsAdapter"
import type { OperationFlowRow } from "../../MounterOperationFlowsAdapter"

type Machine = ReturnType<typeof useOperationModeStateMachine>

const PRODUCTION_UNLOADED_CORRECT = "UNLOADED_MATERIAL_PACK"

export type ProductionSpliceSavedState = {
  rowKey: string
  correct: string | null | undefined
} | null

export type ProductionSpliceCoordinatorDeps<TRow extends OperationFlowRow> = {
  machine: Machine
  rowData: Ref<TRow[]>
  adapter: MounterProductionOperationFlowsAdapter<TRow>
  isMockMode: boolean
  showError: (msg: string) => void
  clearNormalScanState: () => void
  focusMaterialInput: () => void
  // Splice-local input refs (values + DOM)
  spliceMaterialValue: Ref<string>
  spliceSlotValue: Ref<string>
  spliceMaterialInput: Ref<HTMLInputElement | null>
  spliceSlotInput: Ref<HTMLInputElement | null>
  spliceSavedCorrectState: Ref<ProductionSpliceSavedState>
  // Shared helpers from core
  findRowBySlotIdno: (slotIdno: string) => TRow | null
  updateRowInGrid: (row: TRow) => void
  // Live API
  findUniqueUnloadSlotByPackCode: (
    code: string
  ) => { ok: true; slotIdno: string } | { ok: false; error: string }
  validateUnloadMaterialPackCode: (code: string) => Promise<boolean>
  validateReplacementMaterialForSlot: (params: {
    materialPackCode: string
    slotIdno: string
  }) => Promise<boolean>
  submitSplice: (params: { materialPackCode: string; slotIdno: string }) => Promise<boolean>
}

export function createProductionSpliceCoordinator<TRow extends OperationFlowRow>(
  deps: ProductionSpliceCoordinatorDeps<TRow>,
) {
  const {
    machine, rowData, adapter, isMockMode,
    showError, clearNormalScanState, focusMaterialInput,
    spliceMaterialValue, spliceSlotValue,
    spliceMaterialInput, spliceSlotInput, spliceSavedCorrectState,
    findRowBySlotIdno, updateRowInGrid,
    findUniqueUnloadSlotByPackCode,
    validateUnloadMaterialPackCode,
    validateReplacementMaterialForSlot,
    submitSplice,
  } = deps

  const { spliceSlotIdno, spliceNewPackCode } = machine

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

  async function handleSpliceCurrentScan(barcode: string) {
    const resolved = findUniqueUnloadSlotByPackCode(barcode)
    if (resolved.ok === false) {
      showError(resolved.error)
      focusSpliceMaterialInput()
      return
    }
    const row = findRowBySlotIdno(resolved.slotIdno)
    if (!row) {
      showError(`找不到槽位 ${resolved.slotIdno}`)
      focusSpliceMaterialInput()
      return
    }
    if (row.spliceMaterialInventoryIdno) {
      showError(`此站位已有接料條碼，請先卸料後再接料`)
      focusSpliceMaterialInput()
      return
    }

    spliceSavedCorrectState.value = { rowKey: adapter.toRowKey(row), correct: row.correct }
    row.correct = PRODUCTION_UNLOADED_CORRECT
    updateRowInGrid(row)
    machine.onSpliceCurrentScanned(resolved.slotIdno)
    focusSpliceMaterialInput()
  }

  async function handleSpliceNewScan(barcode: string) {
    const isValid = isMockMode || (await validateUnloadMaterialPackCode(barcode))
    if (!isValid) {
      focusSpliceMaterialInput()
      return
    }
    machine.onSpliceNewScanned(barcode)
    focusSpliceSlotInput()
  }

  async function handleSpliceSlotSubmit(slotIdno: string) {
    const targetSlotIdno = spliceSlotIdno.value.trim()
    const newPackCode = spliceNewPackCode.value.trim()

    if (!adapter.slotsMatch(slotIdno, targetSlotIdno)) {
      showError(`請掃描原接料站位 ${targetSlotIdno}`)
      focusSpliceSlotInput()
      return
    }

    const canReplace =
      isMockMode ||
      (await validateReplacementMaterialForSlot({
        materialPackCode: newPackCode,
        slotIdno: targetSlotIdno,
      }))
    if (!canReplace) {
      focusSpliceSlotInput()
      return
    }

    const success = await submitSplice({
      materialPackCode: newPackCode,
      slotIdno: targetSlotIdno,
    })
    if (!success) {
      focusSpliceSlotInput()
      return
    }

    machine.onSpliceSlotSubmitted()
    spliceSavedCorrectState.value = null
    spliceSlotValue.value = ""
    focusSpliceMaterialInput()
  }

  return {
    focusSpliceMaterialInput,
    focusSpliceSlotInput,
    enterSpliceMode,
    exitSpliceMode,
    handleSpliceCurrentScan,
    handleSpliceNewScan,
    handleSpliceSlotSubmit,
  }
}
