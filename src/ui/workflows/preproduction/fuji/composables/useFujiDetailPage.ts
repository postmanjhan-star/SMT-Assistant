import { shallowRef } from "vue"
import { useRouter } from "vue-router"
import type { GridReadyEvent } from "ag-grid-community"
import {
  useFujiProductionState,
  type FujiMounterRowModel,
} from "@/ui/workflows/preproduction/fuji/composables/useFujiProductionState"
import { FujiMounterGridAdapter } from "@/ui/workflows/preproduction/fuji/FujiMounterGridAdapter"
import { createFujiPreproductionGridOptions } from "@/ui/workflows/preproduction/fuji/createFujiPreproductionGridOptions"
import { useFujiPreproductionData } from "@/ui/workflows/preproduction/fuji/composables/useFujiPreproductionData"
import { useFujiPreproductionLifecycle } from "@/ui/workflows/preproduction/fuji/composables/useFujiPreproductionLifecycle"
import { useFujiPreproductionSlotFlow } from "@/ui/workflows/preproduction/fuji/composables/useFujiPreproductionSlotFlow"

export type FujiDetailPageOptions = {
  focusSlotInput?: () => void
}

export function useFujiDetailPage(options: FujiDetailPageOptions = {}) {
  const router = useRouter()
  const { rows: rowData, setFromApi } = useFujiProductionState()

  const { workOrderIdno, productIdno, boardSide, mounterIdno, isTestingMode } =
    useFujiPreproductionData({ setFromApi })

  const lifecycle = useFujiPreproductionLifecycle({
    rowData,
    workOrderIdno,
    productIdno,
    boardSide,
    isTestingMode,
  })

  const gridAdapter = shallowRef<FujiMounterGridAdapter<FujiMounterRowModel> | null>(null)

  function onGridReady(e: GridReadyEvent) {
    gridAdapter.value = new FujiMounterGridAdapter(e.api)
  }

  const slotFlow = useFujiPreproductionSlotFlow({
    rowData,
    isTestingMode,
    gridAdapter,
    focusSlotInput: options.focusSlotInput,
    onAfterSuccess: lifecycle.checkAndStartProduction,
  })

  function onClickBackArrow() {
    router.push("/smt/fuji-mounter/")
  }

  return {
    workOrderIdno,
    productIdno,
    boardSide,
    mounterIdno,
    isTestingMode,
    rowData,
    gridOptions: createFujiPreproductionGridOptions(),
    onGridReady,
    onClickBackArrow,

    productionUuid: lifecycle.productionUuid,
    productionStarted: lifecycle.productionStarted,
    onProduction: lifecycle.onProduction,
    onStopProduction: lifecycle.onStopProduction,

    materialInventory: slotFlow.materialInventory,
    materialResetKey: slotFlow.materialResetKey,
    getMaterialMatchedRows: slotFlow.getMaterialMatchedRows,
    scanMaterial: slotFlow.scanMaterial,
    handleMaterialMatched: slotFlow.handleMaterialMatched,
    handleMaterialError: slotFlow.handleMaterialError,
    handleSlotSubmit: slotFlow.handleSlotSubmit,
    showError: slotFlow.showError,
  }
}
