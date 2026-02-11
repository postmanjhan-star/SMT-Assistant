import { computed, ref, unref } from 'vue'
import { storeToRefs } from 'pinia'
import { usePostProductionFeedStore } from '@/stores/postProductionFeedStore'


export type PanasonicProductionInputsOptions = {
  focusSlotInput?: () => void
}

export function usePanasonicProductionInputs(options: PanasonicProductionInputsOptions = {}) {
  const store = usePostProductionFeedStore()
  const { materialResult } = storeToRefs(store)
  const resetKey = ref(0)
  const hasMaterial = computed(() => !!unref(materialResult))

  function onMaterialMatched(payload: any) {
    store.setMaterialResult(payload)
    options.focusSlotInput?.()
  }

  function onSlotSubmitted() {
    store.clearMaterialResult()
    resetKey.value++
  }

  return {
    materialResult,
    hasMaterial,
    resetKey,
    onMaterialMatched,
    onSlotSubmitted
  }
}
