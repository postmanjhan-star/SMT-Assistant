import { computed, ref, unref, type Ref } from "vue"

// Backward compatible options:
// - `materialResult` can be a local ref or a store ref from `storeToRefs`.
// - optional setter/clearer are preserved for legacy callers.
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

    if (!options.focusSlotInput) return

    options.focusSlotInput()
    requestAnimationFrame(() => {
      options.focusSlotInput?.()
    })
  }

  function bumpResetKeys() {
    resetKey.value += 1
    slotResetKey.value += 1
  }

  function onSlotSubmitted() {
    clearResult()
    bumpResetKeys()
  }

  return {
    resetKey,
    slotResetKey,
    hasMaterial,
    onMaterialMatched,
    onSlotSubmitted,
    bumpResetKeys,
  }
}
