import { nextTick, ref, type ComputedRef, type Ref } from "vue"
import { CheckMaterialMatchEnum } from "@/application/post-production-feed/clientTypes"
import { resolveMaterialLookupError } from "@/domain/material/MaterialLookupError"
import {
  MATERIAL_UNLOAD_TRIGGER,
  MATERIAL_FORCE_UNLOAD_TRIGGER,
  MATERIAL_SPLICE_TRIGGER,
  MATERIAL_IPQC_TRIGGER,
  USER_SWITCH_TRIGGER,
} from "@/domain/mounter/operationModes"
import { msg } from "@/ui/shared/messageCatalog"
import type { useOperationModeStateMachine } from "@/ui/shared/composables/useOperationModeStateMachine"
import type { MounterProductionOperationFlowsAdapter } from "../../MounterProductionOperationFlowsAdapter"
import type { OperationFlowRow } from "../../MounterOperationFlowsAdapter"

type Machine = ReturnType<typeof useOperationModeStateMachine>
type UnloadModeType = Parameters<Machine["enterUnloadMode"]>[0]

const PRODUCTION_UNLOADED_CORRECT = "UNLOADED_MATERIAL_PACK"
const PRODUCTION_MATCHED_CORRECT = "MATCHED_MATERIAL_PACK"

export type ProductionIpqcCoordinatorDeps<TRow extends OperationFlowRow> = {
  machine: Machine
  rowData: Ref<TRow[]>
  adapter: MounterProductionOperationFlowsAdapter<TRow>
  isMockMode: boolean
  isTestingMode: Ref<boolean>
  currentUsername: ComputedRef<string | null>
  showError: (msg: string) => void
  showSuccess: (msg: string) => void
  clearNormalScanState: () => void
  focusMaterialInput: () => void
  handleUserSwitchTrigger: (code: string) => boolean
  // IPQC-local inputs
  ipqcMaterialValue: Ref<string>
  ipqcSlotValue: Ref<string>
  ipqcMaterialInput: Ref<HTMLInputElement | null>
  ipqcSlotInput: Ref<HTMLInputElement | null>
  // Shared helpers from core
  findRowBySlotIdno: (slotIdno: string) => TRow | null
  getCurrentPackCode: (row: TRow) => string
  updateRowInGrid: (row: TRow) => void
  bulkUpdateGrid: () => void
  // Cross-mode switches
  enterUnloadMode: (modeType: UnloadModeType) => void
  enterSpliceMode: () => void
  // Live API
  fetchMaterialInventory: (code: string) => Promise<unknown>
}

export function createProductionIpqcCoordinator<TRow extends OperationFlowRow>(
  deps: ProductionIpqcCoordinatorDeps<TRow>,
) {
  const {
    machine, rowData, adapter, isMockMode, isTestingMode, currentUsername,
    showError, showSuccess, clearNormalScanState, focusMaterialInput, handleUserSwitchTrigger,
    ipqcMaterialValue, ipqcSlotValue, ipqcMaterialInput, ipqcSlotInput,
    findRowBySlotIdno, getCurrentPackCode, updateRowInGrid, bulkUpdateGrid,
    enterUnloadMode, enterSpliceMode, fetchMaterialInventory,
  } = deps

  const ipqcCheckPackCodeMatch = ref<CheckMaterialMatchEnum | null>(null)
  const ipqcSavedCorrectStates = ref<Map<string, string | null | undefined>>(new Map())

  function focusIpqcMaterialInput() {
    nextTick(() => { ipqcMaterialInput.value?.focus() })
  }

  function focusIpqcSlotInput() {
    nextTick(() => { ipqcSlotInput.value?.focus() })
  }

  async function resolveIpqcCorrectState(
    materialPackCode: string,
  ): Promise<CheckMaterialMatchEnum | null> {
    if (isMockMode && !isTestingMode.value) return CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK
    try {
      await fetchMaterialInventory(materialPackCode.trim())
      return CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK
    } catch (error) {
      if (isTestingMode.value) return CheckMaterialMatchEnum.TESTING_MATERIAL_PACK
      showError(resolveMaterialLookupError(error))
      return null
    }
  }

  function showIpqcColumns(visible: boolean) {
    adapter.setColumnVisible("inspectMaterialPackCode", visible)
    adapter.setColumnVisible("inspectTime", visible)
    adapter.setColumnVisible("inspectCount", visible)
    adapter.setColumnVisible("inspectorIdno", visible)
    adapter.toggleNormalColumnsForIpqc?.(visible)
  }

  function enterIpqcMode() {
    machine.enterIpqcMode()
    ipqcCheckPackCodeMatch.value = null
    clearNormalScanState()

    const saved = new Map<string, string | null | undefined>()
    for (const row of rowData.value) {
      const key = adapter.toRowKey(row)
      saved.set(key, row.correct)
      row.correct = PRODUCTION_UNLOADED_CORRECT
    }
    ipqcSavedCorrectStates.value = saved

    bulkUpdateGrid()
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
    if (machine.isIpqcMode.value) {
      exitIpqcMode()
    } else {
      enterIpqcMode()
    }
  }

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
    if (code === MATERIAL_UNLOAD_TRIGGER || code === MATERIAL_FORCE_UNLOAD_TRIGGER) {
      exitIpqcMode()
      ipqcMaterialValue.value = ""
      enterUnloadMode(code === MATERIAL_FORCE_UNLOAD_TRIGGER ? "force_single_slot" : "pack_auto_slot")
      return
    }

    const checkPackCodeMatch = await resolveIpqcCorrectState(materialPackCode)
    if (!checkPackCodeMatch) {
      ipqcMaterialValue.value = ""
      focusIpqcMaterialInput()
      return
    }

    ipqcCheckPackCodeMatch.value = checkPackCodeMatch
    ipqcMaterialValue.value = materialPackCode
    showSuccess(msg.ipqc.materialScanned(materialPackCode))
    focusIpqcSlotInput()
  }

  async function handleIpqcSlotSubmit() {
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

    row.correct = ipqcCheckPackCodeMatch.value ?? PRODUCTION_MATCHED_CORRECT
    row.inspectMaterialPackCode = materialPackCode
    row.inspectTime = new Date().toISOString()
    row.inspectCount = (row.inspectCount ?? 0) + 1
    row.inspectorIdno = currentUsername.value || null

    adapter.afterIpqcRowUpdate?.(row)
    updateRowInGrid(row)

    await adapter.submitIpqcRow(row, materialPackCode, currentUsername.value, ipqcCheckPackCodeMatch.value)

    ipqcCheckPackCodeMatch.value = null
    showSuccess(msg.ipqc.inspectionSuccess(materialPackCode, slotIdno))
    ipqcSlotValue.value = ""
    ipqcMaterialValue.value = ""
    focusIpqcMaterialInput()
  }

  return {
    ipqcCheckPackCodeMatch,
    ipqcSavedCorrectStates,
    focusIpqcMaterialInput,
    focusIpqcSlotInput,
    enterIpqcMode,
    exitIpqcMode,
    toggleIpqcMode,
    handleIpqcMaterialSubmit,
    handleIpqcSlotSubmit,
    showIpqcColumns,
  }
}
