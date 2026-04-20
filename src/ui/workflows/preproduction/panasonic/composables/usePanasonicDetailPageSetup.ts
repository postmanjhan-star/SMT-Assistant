import { nextTick, ref, type Ref } from "vue"
import type { ColumnApi, GridApi, GridReadyEvent } from "ag-grid-community"
import type { InputComponentHandle, SlotInputResult } from "@/pages/mounter/panasonic/types/production"
import { useSlotInputSelection } from "@/ui/shared/composables/useSlotInputSelection"
import { usePanasonicInputReset } from "@/ui/shared/composables/panasonic/usePanasonicInputReset"
import type { IpqcInspectionRecord } from "@/domain/mounter/ipqcTypes"
import type {
  PanasonicUnloadRecord,
  PanasonicSpliceRecord,
} from "@/ui/shared/composables/panasonic/panasonicDetailTypes"
import type { ProductionRowModel } from "@/domain/production/buildPanasonicRowData"

export function usePanasonicDetailPageSetup() {
  const slotIdnoInput = ref<InputComponentHandle | null>(null)
  const materialInventoryInput = ref<InputComponentHandle | null>(null)
  const materialInputValue = ref("")
  const slotInputValue = ref("")

  const gridApi = ref<GridApi | null>(null)
  const columnApi = ref<ColumnApi | null>(null)
  const pendingGridSync = ref(false)

  const materialInventoryResult = ref<SlotInputResult | null>(null)

  const pendingUnloadRecords = ref<PanasonicUnloadRecord[]>([])
  const pendingSpliceRecords = ref<PanasonicSpliceRecord[]>([])
  const pendingIpqcRecords = ref<IpqcInspectionRecord[]>([])
  const splicePreviewCorrectStates = ref(new Map<string, string | null>())

  const inputs = useSlotInputSelection<SlotInputResult>({
    materialResult: materialInventoryResult,
    focusSlotInput: () => slotIdnoInput.value?.focus(),
  })

  function focusMaterialInput() {
    nextTick(() => {
      materialInventoryInput.value?.focus?.()
    })
  }

  function syncGridRows(rows: unknown[]) {
    if (!gridApi.value) {
      pendingGridSync.value = true
      return
    }
    gridApi.value.setRowData(rows as ProductionRowModel[])
  }

  function makeRestoreSplicePreview(
    rowData: Ref<ProductionRowModel[]>,
    updateRowInGrid: (row: ProductionRowModel) => void,
  ) {
    return () => {
      if (splicePreviewCorrectStates.value.size === 0) return
      for (const row of rowData.value) {
        const rowKey = `${row.slotIdno}-${row.subSlotIdno ?? ""}`
        const saved = splicePreviewCorrectStates.value.get(rowKey)
        if (saved !== undefined) {
          row.correct = saved as ProductionRowModel["correct"]
          updateRowInGrid(row)
        }
      }
      splicePreviewCorrectStates.value = new Map()
    }
  }

  function makeClearNormalScanState(restoreSplicePreview: () => void) {
    return () => {
      restoreSplicePreview()
      materialInventoryResult.value = null
      inputs.bumpResetKeys()
      materialInventoryInput.value?.clear?.()
      slotIdnoInput.value?.clear?.()
    }
  }

  function makeInputReset(restoreSplicePreview: () => void) {
    return usePanasonicInputReset({
      clearMaterialResult: () => {
        materialInventoryResult.value = null
        restoreSplicePreview()
      },
      bumpResetKeys: () => inputs.bumpResetKeys(),
      materialInputRef: materialInventoryInput,
      slotInputRef: slotIdnoInput,
    })
  }

  function makeGridReadyHandler(
    onGridReady: (e: GridReadyEvent) => void,
    rowData: Ref<ProductionRowModel[]>,
  ) {
    return (e: GridReadyEvent) => {
      gridApi.value = e.api
      columnApi.value = e.columnApi
      onGridReady(e)
      if (pendingGridSync.value) {
        pendingGridSync.value = false
        syncGridRows(rowData.value)
      }
    }
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
    materialInputValue,
    slotInputValue,
    gridApi,
    columnApi,
    pendingGridSync,
    materialInventoryResult,
    pendingUnloadRecords,
    pendingSpliceRecords,
    pendingIpqcRecords,
    splicePreviewCorrectStates,
    inputs,
    focusMaterialInput,
    syncGridRows,
    makeRestoreSplicePreview,
    makeClearNormalScanState,
    makeInputReset,
    makeGridReadyHandler,
    makeInputBinders,
  }
}
