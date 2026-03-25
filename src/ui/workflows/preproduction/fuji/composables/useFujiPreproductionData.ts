/* eslint-disable no-restricted-imports -- [Phase-1 whitelist] tracked in REFACTORING_BASELINE.md, fix in Phase 3 */
import { ref, type Ref } from "vue"
import { useRoute, useRouter } from "vue-router"
import { type BoardSideEnum, type FujiMounterFileRead } from "@/client"
import { useUiNotifier } from "@/ui/shared/composables/useUiNotifier"
import { normalizeRouteValue } from "@/ui/shared/route/normalizeRouteValue"
import { usePreproductionLoader } from "@/ui/shared/composables/usePreproductionLoader"
import { msg } from "@/ui/shared/messageCatalog"

export type FetchSlotsParams = {
  workOrderIdno: string
  mounterIdno: string
  productIdno: string
  boardSide: any
  testingMode: boolean
  testingProductIdno?: string | null
}

export type UseFujiPreproductionDataOptions = {
  setFromApi: (rows: FujiMounterFileRead[]) => void
  fetchSlots: (params: FetchSlotsParams) => Promise<FujiMounterFileRead[]>
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

  usePreproductionLoader({
    load: async () => {
      const data = await options.fetchSlots({
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
    },
    onNotFound: () => router.push("/http-status/404"),
    onOtherError: (error) => {
      showError(msg.production.fileLoadFailed)
      console.error(error)
    },
  })

  return {
    workOrderIdno,
    productIdno,
    boardSide,
    mounterIdno,
    isTestingMode,
  }
}
