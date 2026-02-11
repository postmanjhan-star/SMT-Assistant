import { watch, shallowRef } from 'vue'
import type { GridApi, GridReadyEvent } from 'ag-grid-community'
import { SlotSubmitFeedGridAdapter } from '@/ui/shared/grid/slot-submit/SlotSubmitFeedGridAdapter'
import { useSlotSubmitStore } from '@/stores/slotSubmitStore'

export type ProductionGridBindingOptions = {
  resetInputs?: () => void
}

export function useProductionGridBinding(options: ProductionGridBindingOptions = {}) {
  const gridApi = shallowRef<GridApi | null>(null)
  const store = useSlotSubmitStore()

  function onGridReady(e: GridReadyEvent) {
    gridApi.value = e.api
  }

  watch(gridApi, api => {
    if (!api) return
    store.bindDeps({
      grid: new SlotSubmitFeedGridAdapter(api),
      resetInputs: options.resetInputs ?? (() => {})
    })
  })

  return {
    gridApi,
    onGridReady
  }
}
