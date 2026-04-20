import type { Ref } from "vue"
import {
  MATERIAL_UNLOAD_TRIGGER,
  MATERIAL_FORCE_UNLOAD_TRIGGER,
  MATERIAL_SPLICE_TRIGGER,
  MATERIAL_IPQC_TRIGGER,
} from "@/domain/mounter/operationModes"
import type { useOperationModeStateMachine } from "@/ui/shared/composables/useOperationModeStateMachine"

type Machine = ReturnType<typeof useOperationModeStateMachine>
type UnloadModeType = Parameters<Machine["enterUnloadMode"]>[0]

export type ProductionScanDispatcherDeps = {
  isIpqcMode: Ref<boolean>
  isUnloadMode: Ref<boolean>
  unloadModeType: Ref<UnloadModeType | null>
  handleUserSwitchTrigger: (code: string) => boolean
  enterUnloadMode: (modeType: UnloadModeType) => void
  exitUnloadMode: () => void
  enterIpqcMode: () => void
  exitIpqcMode: () => void
  toggleIpqcMode: () => void
  enterSpliceMode: () => void
  exitSpliceMode: () => void
}

export function createProductionScanDispatcher(deps: ProductionScanDispatcherDeps) {
  const {
    isIpqcMode, isUnloadMode, unloadModeType,
    handleUserSwitchTrigger,
    enterUnloadMode, exitUnloadMode,
    enterIpqcMode, exitIpqcMode, toggleIpqcMode,
    enterSpliceMode, exitSpliceMode,
  } = deps

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

  return {
    handleModeTriggerFromNormalInput,
    handleModeTriggerFromUnloadInput,
    handleModeTriggerFromSpliceInput,
  }
}
