import { shallowRef } from "vue"
import { useRouter } from "vue-router"
import type { GridReadyEvent } from "ag-grid-community"
import { useFujiProductionState } from "@/ui/workflows/preproduction/fuji/composables/useFujiProductionState"
import { FujiMounterGridAdapter } from "@/ui/workflows/preproduction/fuji/FujiMounterGridAdapter"
import type { SlotSubmitGridPort } from "@/application/slot-submit/SlotSubmitDeps"
import { findAvailableMaterialRows } from "@/domain/material/FujiMaterialMatchRules"
import { createFujiPreproductionGridOptions } from "@/ui/workflows/preproduction/fuji/createFujiPreproductionGridOptions"
import { useFujiPreproductionData } from "@/ui/workflows/preproduction/fuji/composables/useFujiPreproductionData"
import {
  useFujiPreproductionLifecycle,
  type FujiUnloadRecord,
  type FujiSpliceRecord,
} from "@/ui/workflows/preproduction/fuji/composables/useFujiPreproductionLifecycle"
import { createFujiPreproductionDeps } from "@/ui/di/fuji/createFujiPreproductionDeps"
import type { IpqcInspectionRecord } from "@/domain/mounter/ipqcTypes"
import { useFujiPreproductionSlotFlow } from "@/ui/workflows/preproduction/fuji/composables/useFujiPreproductionSlotFlow"
import { useCurrentUsername } from "@/ui/shared/composables/useCurrentUsername"
import { useUiNotifier } from "@/ui/shared/composables/useUiNotifier"
import { useSlotResultNotifier } from "@/ui/shared/composables/useSlotResultNotifier"

export type FujiDetailPageOptions = {
  focusSlotInput?: () => void
  getPendingUnloadRecords?: () => FujiUnloadRecord[]
  onUnloadUploaded?: (ok: boolean) => void
  getPendingSpliceRecords?: () => FujiSpliceRecord[]
  getPendingIpqcRecords?: () => IpqcInspectionRecord[]
  onIpqcUploaded?: (ok: boolean) => void
  isMockMode?: boolean
}

export function useFujiDetailPage(options: FujiDetailPageOptions = {}) {
  const router = useRouter()
  const { currentUsername, currentOperatorIdno } = useCurrentUsername()
  const ui = useUiNotifier()
  useSlotResultNotifier(ui)
  const { rows: rowData, setFromApi } = useFujiProductionState()
  const fujiPreDeps = createFujiPreproductionDeps()

  const { workOrderIdno, productIdno, boardSide, mounterIdno, isTestingMode } =
    useFujiPreproductionData({ setFromApi, fetchSlots: fujiPreDeps.fetchSlots })

  const lifecycle = useFujiPreproductionLifecycle({
    rowData,
    workOrderIdno,
    productIdno,
    boardSide,
    isTestingMode,
    getPendingUnloadRecords: options.getPendingUnloadRecords,
    onUnloadUploaded: options.onUnloadUploaded,
    getPendingSpliceRecords: options.getPendingSpliceRecords,
    getPendingIpqcRecords: options.getPendingIpqcRecords,
    onIpqcUploaded: options.onIpqcUploaded,
    startProduction: fujiPreDeps.startProduction,
    stopProduction: fujiPreDeps.stopProduction,
    getOperatorId: () => currentUsername.value || null,
  })

  const gridAdapter = shallowRef<SlotSubmitGridPort | null>(null)

  function onGridReady(e: GridReadyEvent) {
    gridAdapter.value = new FujiMounterGridAdapter(e.api)
  }

  const slotFlow = useFujiPreproductionSlotFlow({
    getMaterialMatchedRows: (id) => findAvailableMaterialRows(rowData.value, id),
    isTestingMode,
    isMockMode: options.isMockMode,
    gridAdapter,
    focusSlotInput: options.focusSlotInput,
    onAfterSuccess: lifecycle.checkAndStartProduction,
    autoUpload: () => lifecycle.startProductionUpload(),
    materialRepository: fujiPreDeps.createMaterialRepository(),
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
    currentUsername,
    currentOperatorIdno,
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
    resetMaterialState: slotFlow.resetMaterialState,
    handleSlotSubmit: slotFlow.handleSlotSubmit,
    showError: slotFlow.showError,
    fetchMaterialInventory: fujiPreDeps.fetchMaterialInventory,
  }
}
