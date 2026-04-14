import { nextTick, ref, type Ref } from "vue"
import type { CheckMaterialMatchEnum } from "@/client"
import type { IpqcInspectionRecord } from "@/domain/mounter/ipqcTypes"
import {
  MATERIAL_FORCE_UNLOAD_TRIGGER,
  MATERIAL_IPQC_TRIGGER,
  MATERIAL_SPLICE_TRIGGER,
  MATERIAL_UNLOAD_TRIGGER,
  USER_SWITCH_TRIGGER,
} from "@/domain/mounter/operationModes"
import type { MounterOperationFlowsAdapter } from "../MounterOperationFlowsAdapter"
import { CORRECT_STATE } from "./materialPackCodeHelpers"

export type IpqcCoordinatorDeps = {
  machine: {
    enterIpqcMode: () => void
    exitToNormal: () => void
  }
  adapter: Pick<
    MounterOperationFlowsAdapter,
    "setColumnVisible" | "toggleNormalColumnsForIpqc" | "toRowKey" | "buildIpqcRecord"
  >
  rowData: Ref<any[]>
  currentUsername: Ref<string | null> | { value: string | null }
  pendingIpqcRecords: Ref<IpqcInspectionRecord[]>
  resolveExistenceBasedCorrectState: (code: string) => Promise<CheckMaterialMatchEnum | null>
  getCurrentPackCode: (row: any) => string
  findRowBySlotIdno: (slot: string) => any | null
  updateRowInGrid: (row: any) => void
  showError: (msg: string) => void
  clearNormalScanState: () => void
  focusMaterialInput: () => void
  persistNow: () => void
  handleUserSwitchTrigger: (code: string) => boolean
  enterSpliceMode: () => void
  enterUnloadMode: (type: "pack_auto_slot" | "force_single_slot") => void
}

export function createIpqcCoordinator(deps: IpqcCoordinatorDeps) {
  const {
    machine, adapter, rowData, currentUsername, pendingIpqcRecords,
    resolveExistenceBasedCorrectState, getCurrentPackCode, findRowBySlotIdno,
    updateRowInGrid, showError, clearNormalScanState, focusMaterialInput,
    persistNow, handleUserSwitchTrigger, enterSpliceMode, enterUnloadMode,
  } = deps

  const ipqcCheckPackCodeMatch = ref<CheckMaterialMatchEnum | null>(null)
  const ipqcMaterialValue = ref("")
  const ipqcSlotValue     = ref("")
  const ipqcMaterialInput = ref<HTMLInputElement | null>(null)
  const ipqcSlotInput     = ref<HTMLInputElement | null>(null)
  const ipqcSavedCorrectStates = ref<Map<string, unknown>>(new Map())

  function showIpqcColumns(visible: boolean) {
    adapter.setColumnVisible("inspectMaterialPackCode", visible)
    adapter.setColumnVisible("inspectTime", visible)
    adapter.setColumnVisible("inspectCount", visible)
    adapter.setColumnVisible("inspectorIdno", visible)
    adapter.toggleNormalColumnsForIpqc?.(visible)
  }

  function focusIpqcMaterialInput() {
    nextTick(() => { ipqcMaterialInput.value?.focus() })
  }

  function focusIpqcSlotInput() {
    nextTick(() => { ipqcSlotInput.value?.focus() })
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

  function onIpqcUploaded(ok: boolean) {
    if (!ok) return
    pendingIpqcRecords.value = []
    persistNow()
  }

  return {
    ipqcCheckPackCodeMatch,
    ipqcMaterialValue,
    ipqcSlotValue,
    ipqcMaterialInput,
    ipqcSlotInput,
    showIpqcColumns,
    focusIpqcMaterialInput,
    focusIpqcSlotInput,
    enterIpqcMode,
    exitIpqcMode,
    handleIpqcMaterialSubmit,
    handleIpqcSlotSubmit,
    onIpqcUploaded,
  }
}

export type IpqcCoordinator = ReturnType<typeof createIpqcCoordinator>
