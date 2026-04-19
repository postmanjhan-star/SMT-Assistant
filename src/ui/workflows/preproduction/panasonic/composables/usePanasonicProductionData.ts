import { ref } from "vue"
import { useRoute, useRouter } from "vue-router"
import type { PanasonicMounterFileRead } from "@/application/preproduction/clientTypes"
import type { PanasonicFetchSlotsParams } from "@/application/panasonic/di/PanasonicWorkflowDeps"
import { PanasonicProductionRowBuilder } from "@/domain/production/PanasonicProductionRowBuilder"
import type { ProductionRowModel } from "@/pages/mounter/panasonic/types/production"
import {
  PANASONIC_BOARD_SIDE_VALUES,
  PANASONIC_MACHINE_SIDE_VALUES,
  PANASONIC_NOT_FOUND_PATH,
  type PanasonicBoardSide,
  type PanasonicMachineSide,
} from "@/ui/shared/composables/panasonic/usePanasonicConstants"
import { normalizeRouteValue } from "@/ui/shared/route/normalizeRouteValue"
import { usePreproductionLoader } from "@/ui/shared/composables/usePreproductionLoader"

function toBoardSide(value: unknown): PanasonicBoardSide | null {
  const normalized = normalizeRouteValue(value)
  if (!normalized) return null

  return (PANASONIC_BOARD_SIDE_VALUES as readonly string[]).includes(normalized)
    ? (normalized as PanasonicBoardSide)
    : null
}

function toMachineSide(value: unknown): PanasonicMachineSide | null {
  const normalized = normalizeRouteValue(value)
  if (!normalized) return null

  return (PANASONIC_MACHINE_SIDE_VALUES as readonly string[]).includes(normalized)
    ? (normalized as PanasonicMachineSide)
    : null
}

export function usePanasonicProductionData(
  fetchSlots: (params: PanasonicFetchSlotsParams) => Promise<PanasonicMounterFileRead>
) {
  const route = useRoute()
  const router = useRouter()

  const mounterData = ref<PanasonicMounterFileRead | null>(null)
  const rowData = ref<ProductionRowModel[]>([])

  const { loading } = usePreproductionLoader({
    load: async () => {
      const workOrderIdno = normalizeRouteValue(route.params.workOrderIdno)
      const mounterIdno = normalizeRouteValue(route.params.mounterIdno)
      const productIdno = normalizeRouteValue(route.query.product_idno)
      const boardSide = toBoardSide(route.query.work_sheet_side)
      const machineSide = toMachineSide(route.query.machine_side)

      if (!workOrderIdno || !mounterIdno || !productIdno || !boardSide || !machineSide) {
        router.push(PANASONIC_NOT_FOUND_PATH)
        return
      }

      mounterData.value = await fetchSlots({
        workOrderIdno,
        mounterIdno,
        productIdno,
        boardSide,
        machineSide,
        testingMode: route.query.testing_mode === "1",
        testingProductIdno: route.query.testing_product_idno
          ? normalizeRouteValue(route.query.testing_product_idno)
          : null,
      })

      rowData.value = PanasonicProductionRowBuilder.build(
        mounterData.value.panasonic_mounter_file_items ?? []
      )
    },
    notFoundStatuses: [404, 503],
    onNotFound: () => router.push(PANASONIC_NOT_FOUND_PATH),
  })

  return {
    loading,
    mounterData,
    rowData,
  }
}
