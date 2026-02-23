import type { Ref } from "vue"

type InputComponentHandle = {
  focus: () => void
  clear?: () => void
}

export type PanasonicInputResetOptions = {
  clearMaterialResult: () => void
  bumpResetKeys: () => void
  materialInputRef: Ref<InputComponentHandle | null>
  slotInputRef: Ref<InputComponentHandle | null>
}

export function usePanasonicInputReset(options: PanasonicInputResetOptions) {
  function resetInputsAfterSlotSubmit() {
    options.clearMaterialResult()
    options.bumpResetKeys()
    options.materialInputRef.value?.clear?.()
    options.slotInputRef.value?.clear?.()

    requestAnimationFrame(() => {
      options.materialInputRef.value?.focus?.()
    })
  }

  return {
    resetInputsAfterSlotSubmit,
  }
}
