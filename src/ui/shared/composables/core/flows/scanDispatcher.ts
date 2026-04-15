import type { ComputedRef, Ref } from "vue"
import {
  MATERIAL_FORCE_UNLOAD_TRIGGER,
  MATERIAL_IPQC_TRIGGER,
  MATERIAL_SPLICE_TRIGGER,
  MATERIAL_UNLOAD_TRIGGER,
} from "@/domain/mounter/operationModes"

export type ScanDispatcherDeps = {
  // Mode state
  isIpqcMode: ComputedRef<boolean> | Ref<boolean>
  isUnloadMode: ComputedRef<boolean> | Ref<boolean>
  isSpliceMode: ComputedRef<boolean> | Ref<boolean>
  isSpliceIdlePhase: ComputedRef<boolean> | Ref<boolean>
  isSpliceNewPhase: ComputedRef<boolean> | Ref<boolean>
  isSpliceSlotPhase: ComputedRef<boolean> | Ref<boolean>

  // Splice input refs
  spliceMaterialValue: Ref<string>
  spliceSlotValue: Ref<string>

  // Utilities
  handleUserSwitchTrigger: (code: string) => boolean
  isBarcodeAlreadyInGrid: (code: string) => boolean
  showError: (msg: string) => void
  focusSpliceMaterialInput: () => void

  // Mode control
  enterIpqcMode: () => void
  exitIpqcMode: () => void
  enterUnloadMode: (type: "pack_auto_slot" | "force_single_slot") => void
  exitUnloadMode: () => void
  enterSpliceMode: () => void

  // Splice handlers
  handleModeTriggerFromSpliceInput: (code: string) => boolean
  handleSpliceCurrentScan: (code: string) => Promise<void>
  handleSpliceNewScan: (code: string) => Promise<void>
  handleSpliceSlotSubmit: (slotIdno: string) => Promise<void>
}

export function createScanDispatcher(deps: ScanDispatcherDeps) {
  const {
    isIpqcMode, isUnloadMode, isSpliceMode,
    isSpliceIdlePhase, isSpliceNewPhase, isSpliceSlotPhase,
    spliceMaterialValue, spliceSlotValue,
    handleUserSwitchTrigger, isBarcodeAlreadyInGrid, showError, focusSpliceMaterialInput,
    enterIpqcMode, exitIpqcMode,
    enterUnloadMode, exitUnloadMode,
    enterSpliceMode,
    handleModeTriggerFromSpliceInput,
    handleSpliceCurrentScan, handleSpliceNewScan, handleSpliceSlotSubmit,
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

  return {
    handleModeTriggerFromNormalInput,
    handleBeforeMaterialScan,
    handleBeforeSlotSubmit,
    handleSpliceMaterialEnter,
    handleSpliceSlotEnter,
  }
}

export type ScanDispatcher = ReturnType<typeof createScanDispatcher>
