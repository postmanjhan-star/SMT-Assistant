import { computed, nextTick, ref, type Ref } from "vue"
import type { ColumnApi, GridApi, GridReadyEvent } from "ag-grid-community"
import { storeToRefs } from "pinia"
import {
  usePostProductionFeedStore,
  type PostProductionMaterialResult,
} from "@/stores/postProductionFeedStore"
import { useSlotInputSelection } from "@/ui/shared/composables/useSlotInputSelection"
import { usePanasonicInputReset } from "@/ui/shared/composables/panasonic/usePanasonicInputReset"
import {
  PANASONIC_MODE_NAME_NORMAL,
  PANASONIC_MODE_NAME_TESTING,
} from "@/ui/shared/composables/panasonic/usePanasonicConstants"
import type { InputComponentHandle } from "@/pages/mounter/panasonic/types/production"

export function usePanasonicProductionPageSetup() {
  const slotIdnoInput = ref<InputComponentHandle | null>(null)
  const materialInventoryInput = ref<InputComponentHandle | null>(null)

  const store = usePostProductionFeedStore()
  const { materialResult } = storeToRefs(store)

  const inputs = useSlotInputSelection<PostProductionMaterialResult>({
    materialResult,
    focusSlotInput: () => slotIdnoInput.value?.focus(),
  })

  const { resetInputsAfterSlotSubmit } = usePanasonicInputReset({
    clearMaterialResult: () => store.clearMaterialResult(),
    bumpResetKeys: () => inputs.bumpResetKeys(),
    materialInputRef: materialInventoryInput,
    slotInputRef: slotIdnoInput,
  })

  const localGridApi = ref<GridApi | null>(null)
  const localColumnApi = ref<ColumnApi | null>(null)

  function makeGridReadyHandler(onGridReady: (e: GridReadyEvent) => void) {
    return (e: GridReadyEvent) => {
      localGridApi.value = e.api
      localColumnApi.value = e.columnApi
      onGridReady(e)
    }
  }

  function makeProductionModeComputeds(isTestingMode: Ref<boolean>) {
    const productionModeName = computed(() =>
      isTestingMode.value ? PANASONIC_MODE_NAME_TESTING : PANASONIC_MODE_NAME_NORMAL
    )
    const productionModeType = computed<"warning" | "success">(() =>
      isTestingMode.value ? "warning" : "success"
    )
    return { productionModeName, productionModeType }
  }

  function focusMaterialInventoryInput() {
    nextTick(() => {
      materialInventoryInput.value?.focus()
    })
  }

  function clearNormalScanState() {
    store.clearMaterialResult()
    inputs.bumpResetKeys()
    materialInventoryInput.value?.clear?.()
    slotIdnoInput.value?.clear?.()
  }

  function makeInputBinders(refs: {
    unloadMaterialInput: Ref<HTMLInputElement | null>
    unloadSlotInput: Ref<HTMLInputElement | null>
    ipqcMaterialInput: Ref<HTMLInputElement | null>
    ipqcSlotInput: Ref<HTMLInputElement | null>
    spliceMaterialInput: Ref<HTMLInputElement | null>
    spliceSlotInput: Ref<HTMLInputElement | null>
  }) {
    const toInput = (el: Element | null) => el as HTMLInputElement | null
    return {
      bindUnloadMaterialInput: (el: Element | null) => { refs.unloadMaterialInput.value = toInput(el) },
      bindUnloadSlotInput: (el: Element | null) => { refs.unloadSlotInput.value = toInput(el) },
      bindIpqcMaterialInput: (el: Element | null) => { refs.ipqcMaterialInput.value = toInput(el) },
      bindIpqcSlotInput: (el: Element | null) => { refs.ipqcSlotInput.value = toInput(el) },
      bindSpliceMaterialInput: (el: Element | null) => { refs.spliceMaterialInput.value = toInput(el) },
      bindSpliceSlotInput: (el: Element | null) => { refs.spliceSlotInput.value = toInput(el) },
    }
  }

  return {
    slotIdnoInput,
    materialInventoryInput,
    store,
    materialResult,
    inputs,
    resetInputsAfterSlotSubmit,
    localGridApi,
    localColumnApi,
    focusMaterialInventoryInput,
    clearNormalScanState,
    makeGridReadyHandler,
    makeProductionModeComputeds,
    makeInputBinders,
  }
}
