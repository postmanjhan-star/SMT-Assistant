import { computed, ref, unref, type Ref } from 'vue'

export type SlotInputSelectionOptions<T> = {
  materialResult: Ref<T | null>
  focusSlotInput?: () => void
  setMaterialResult?: (payload: T) => void
  clearMaterialResult?: () => void
}

export function useSlotInputSelection<T>(options: SlotInputSelectionOptions<T>) {
  const resetKey = ref(0)
  const slotResetKey = ref(0)
  const hasMaterial = computed(() => !!unref(options.materialResult))

  function setResult(payload: T) {
    if (options.setMaterialResult) {
      return options.setMaterialResult(payload)
    }
    options.materialResult.value = payload
  }

  function clearResult() {
    if (options.clearMaterialResult) {
      return options.clearMaterialResult()
    }
    options.materialResult.value = null
  }

  function onMaterialMatched(payload: T) {
    setResult(payload)
    if (options.focusSlotInput) {
      options.focusSlotInput()
      requestAnimationFrame(() => {
        options.focusSlotInput?.()
      })
    }
  }

  function onSlotSubmitted() {
    clearResult()
    resetKey.value += 1
    slotResetKey.value += 1
  }

  return {
    resetKey,
    slotResetKey,
    hasMaterial,
    onMaterialMatched,
    onSlotSubmitted,
  }
}
