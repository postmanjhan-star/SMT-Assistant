import { nextTick, type Ref } from "vue"
import type { useOperationModeStateMachine } from "@/ui/shared/composables/useOperationModeStateMachine"
import type { MounterProductionOperationFlowsAdapter } from "../../MounterProductionOperationFlowsAdapter"
import type { OperationFlowRow } from "../../MounterOperationFlowsAdapter"

type Machine = ReturnType<typeof useOperationModeStateMachine>
type UnloadModeType = Parameters<Machine["enterUnloadMode"]>[0]

export type ProductionUnloadCoordinatorDeps<TRow extends OperationFlowRow> = {
  machine: Machine
  adapter: MounterProductionOperationFlowsAdapter<TRow>
  isMockMode: boolean
  showError: (msg: string) => void
  clearNormalScanState: () => void
  focusMaterialInput: () => void
  // Unload-local inputs
  unloadMaterialValue: Ref<string>
  unloadSlotValue: Ref<string>
  unloadMaterialInput: Ref<HTMLInputElement | null>
  unloadSlotInput: Ref<HTMLInputElement | null>
  // Live API
  submitUnload: (params: { materialPackCode: string; slotIdno: string }) => Promise<boolean>
  submitForceUnloadBySlot: (params: {
    slotIdno: string
    unfeedReason?: string | null
  }) => Promise<{ ok: boolean; slotIdno?: string }>
  findUniqueUnloadSlotByPackCode: (
    code: string
  ) => { ok: true; slotIdno: string } | { ok: false; error: string }
  validateReplacementMaterialForSlot: (params: {
    materialPackCode: string
    slotIdno: string
  }) => Promise<boolean>
  submitReplace: (params: { materialPackCode: string; slotIdno: string }) => Promise<boolean>
}

export function createProductionUnloadCoordinator<TRow extends OperationFlowRow>(
  deps: ProductionUnloadCoordinatorDeps<TRow>,
) {
  const {
    machine, adapter, isMockMode,
    showError, clearNormalScanState, focusMaterialInput,
    unloadMaterialValue, unloadSlotValue,
    unloadMaterialInput, unloadSlotInput,
    submitUnload, submitForceUnloadBySlot, findUniqueUnloadSlotByPackCode,
    validateReplacementMaterialForSlot, submitReplace,
  } = deps

  const {
    isForceUnloadSlotPhase,
    isReplaceSlotPhase,
    unloadModeType,
    resolvedUnloadSlotIdno,
    replacementMaterialPackCode,
  } = machine

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

  function enterUnloadMode(modeType: UnloadModeType) {
    machine.enterUnloadMode(modeType)
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
    unloadMaterialValue.value = ""
    unloadSlotValue.value = ""
    clearNormalScanState()
    focusMaterialInput()
  }

  async function handleUnloadMaterialSubmit(materialPackCode: string) {
    const resolved = findUniqueUnloadSlotByPackCode(materialPackCode)
    if (resolved.ok === false) {
      showError(resolved.error)
      unloadMaterialValue.value = ""
      focusUnloadMaterialInput()
      return
    }

    const success = await submitUnload({
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
    const result = await submitForceUnloadBySlot({
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
      showError("找不到卸料站位，請重新掃描")
      machine.enterUnloadMode(unloadModeType.value)
      unloadMaterialValue.value = ""
      nextTick(() => {
        if (isForceUnloadSlotPhase.value) {
          focusUnloadSlotInput()
        } else {
          focusUnloadMaterialInput()
        }
      })
      return
    }

    const canReplace = isMockMode || await validateReplacementMaterialForSlot({
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

  async function handleReplaceSlotSubmit(slotIdno: string) {
    const targetSlotIdno      = resolvedUnloadSlotIdno.value.trim()
    const replacementPackCode = replacementMaterialPackCode.value.trim()

    if (!adapter.slotsMatch(slotIdno, targetSlotIdno)) {
      showError(`請掃描原卸料站位 ${targetSlotIdno}`)
      unloadSlotValue.value = ""
      focusUnloadSlotInput()
      return
    }

    if (!replacementPackCode) {
      showError("找不到更換捲號，請重新掃描")
      machine.enterUnloadMode(unloadModeType.value)
      focusUnloadMaterialInput()
      return
    }

    const success = await submitReplace({
      materialPackCode: replacementPackCode,
      slotIdno: targetSlotIdno,
    })

    unloadSlotValue.value = ""
    if (!success) {
      focusUnloadSlotInput()
      return
    }

    exitUnloadMode()
  }

  return {
    focusUnloadMaterialInput,
    focusUnloadSlotInput,
    focusByCurrentPhase,
    enterUnloadMode,
    exitUnloadMode,
    handleUnloadMaterialSubmit,
    handleForceUnloadSlotSubmit,
    handleReplacementMaterialSubmit,
    handleReplaceSlotSubmit,
  }
}
