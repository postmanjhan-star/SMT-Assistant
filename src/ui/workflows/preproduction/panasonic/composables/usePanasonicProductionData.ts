import { ref, onMounted } from "vue"
import { useRoute, useRouter } from "vue-router"
import { ApiError, type PanasonicMounterFileRead } from "@/client"
import { loadPanasonicProductionSlots } from "@/application/preproduction/PanasonicProductionLoadUseCase"
import type { ProductionRowModel } from "@/pages/mounter/panasonic/types/production"
import {
  PANASONIC_BOARD_SIDE_VALUES,
  PANASONIC_MACHINE_SIDE_VALUES,
  PANASONIC_NOT_FOUND_PATH,
  type PanasonicBoardSide,
  type PanasonicMachineSide,
} from "@/ui/shared/composables/panasonic/usePanasonicConstants"

function normalizeRouteValue(value: unknown): string {
  if (Array.isArray(value)) {
    return String(value[0] ?? "").trim()
  }

  return String(value ?? "").trim()
}

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

export function usePanasonicProductionData() {
  const route = useRoute()
  const router = useRouter()

  const mounterData = ref<PanasonicMounterFileRead | null>(null)
  const rowData = ref<ProductionRowModel[]>([])
  const loading = ref(false)

  onMounted(async () => {
    loading.value = true

    try {
      const workOrderIdno = normalizeRouteValue(route.params.workOrderIdno)
      const mounterIdno = normalizeRouteValue(route.params.mounterIdno)
      const productIdno = normalizeRouteValue(route.query.product_idno)
      const boardSide = toBoardSide(route.query.work_sheet_side)
      const machineSide = toMachineSide(route.query.machine_side)

      if (!workOrderIdno || !mounterIdno || !productIdno || !boardSide || !machineSide) {
        router.push(PANASONIC_NOT_FOUND_PATH)
        return
      }

      mounterData.value = await loadPanasonicProductionSlots({
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

      rowData.value = mounterData.value.panasonic_mounter_file_items.map((i) => ({
        correct: null,
        id: i.id,
        slotIdno: i.slot_idno,
        subSlotIdno: i.sub_slot_idno,
        firstAppendTime: null,
        materialIdno: i.smd_model_idno,
        appendedMaterialInventoryIdno: "",
        materialInventoryIdno: "",
      }))
    } catch (e) {
      if (e instanceof ApiError && [404, 503].includes(e.status)) {
        router.push(PANASONIC_NOT_FOUND_PATH)
      }
    } finally {
      loading.value = false
    }
  })

  return {
    loading,
    mounterData,
    rowData,
  }
}
