import { onMounted, ref, type Ref } from "vue"
import { useRoute, useRouter } from "vue-router"
import { ApiError, type BoardSideEnum, type FujiMounterFileRead } from "@/client"
import { loadFujiProductionSlots } from "@/application/preproduction/FujiProductionLoadUseCase"
import { useUiNotifier } from "@/ui/shared/composables/useUiNotifier"
import { normalizeRouteValue } from "@/ui/shared/route/normalizeRouteValue"

export type UseFujiPreproductionDataOptions = {
  setFromApi: (rows: FujiMounterFileRead[]) => void
}

export type FujiPreproductionDataState = {
  workOrderIdno: Ref<string>
  productIdno: Ref<string>
  boardSide: Ref<BoardSideEnum>
  mounterIdno: Ref<string>
  isTestingMode: Ref<boolean>
}

export function useFujiPreproductionData(
  options: UseFujiPreproductionDataOptions
): FujiPreproductionDataState {
  const route = useRoute()
  const router = useRouter()
  const { error: showError } = useUiNotifier()

  const workOrderIdno = ref<string>(normalizeRouteValue(route.params.workOrderIdno))
  const productIdno = ref<string>(normalizeRouteValue(route.query.product_idno))
  const boardSide = ref<BoardSideEnum>(route.query.work_sheet_side as BoardSideEnum)
  const mounterIdno = ref<string>(normalizeRouteValue(route.params.mounterIdno))
  const isTestingMode = ref<boolean>(route.query.testing_mode === "1")

  onMounted(async () => {
    try {
      const data = await loadFujiProductionSlots({
        workOrderIdno: workOrderIdno.value,
        mounterIdno: mounterIdno.value,
        productIdno: productIdno.value,
        boardSide: boardSide.value,
        testingMode: isTestingMode.value,
        testingProductIdno: isTestingMode.value
          ? normalizeRouteValue(route.query.testing_product_idno)
          : null,
      })
      options.setFromApi(data)
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        router.push("/http-status/404")
        return
      }

      showError("讀取檔案資料失敗")
      console.error(error)
    }
  })

  return {
    workOrderIdno,
    productIdno,
    boardSide,
    mounterIdno,
    isTestingMode,
  }
}
