import { ref, type Ref } from "vue"
import { useDialog } from "naive-ui"
import { useRoute, useRouter } from "vue-router"
import {
  CheckMaterialMatchEnum,
  FeedMaterialTypeEnum,
  MaterialOperationTypeEnum,
  ProduceTypeEnum,
  type BoardSideEnum,
  type FujiMounterItemStatCreate,
} from "@/client"
import { useUiNotifier } from "@/ui/shared/composables/useUiNotifier"
import { startFujiProduction } from "@/application/fuji/production/StartFujiProduction"
import { stopFujiProduction } from "@/application/fuji/production/StopFujiProduction"
import type { FujiMounterRowModel } from "@/ui/workflows/preproduction/fuji/composables/useFujiProductionState"

export type UseFujiPreproductionLifecycleOptions = {
  rowData: Ref<FujiMounterRowModel[]>
  workOrderIdno: Ref<string>
  productIdno: Ref<string>
  boardSide: Ref<BoardSideEnum>
  isTestingMode: Ref<boolean>
}

type FujiStartStatPayload = FujiMounterItemStatCreate & {
  feed_material_pack_type?: FeedMaterialTypeEnum
  operation_type?: MaterialOperationTypeEnum
}

export function useFujiPreproductionLifecycle(
  options: UseFujiPreproductionLifecycleOptions
) {
  const route = useRoute()
  const router = useRouter()
  const dialog = useDialog()
  const { success: showSuccess, error: showError } = useUiNotifier()

  const productionUuid = ref("")
  const productionStarted = ref(false)

  async function startProductionUpload() {
    try {
      const payload: FujiStartStatPayload[] = options.rowData.value.map((row) => ({
        work_order_no: options.workOrderIdno.value,
        product_idno: options.productIdno.value,
        machine_idno: row.mounterIdno,
        board_side: options.boardSide.value,
        slot_idno: row.slot.toString(),
        sub_slot_idno: row.stage,
        material_idno: row.materialIdno,
        material_pack_code: row.materialInventoryIdno ?? null,
        feed_material_pack_type: FeedMaterialTypeEnum.IMPORTED_MATERIAL_PACK,
        operation_type: MaterialOperationTypeEnum.FEED,
        produce_mode: options.isTestingMode.value
          ? ProduceTypeEnum.TESTING_PRODUCE_MODE
          : ProduceTypeEnum.NORMAL_PRODUCE_MODE,
        check_pack_code_match: row.correct,
        operator_id: null,
        operation_time: new Date().toISOString(),
        production_start: new Date().toISOString(),
      }))

      const response = await startFujiProduction(payload)

      if (response && response.length > 0 && response[0].uuid) {
        showSuccess("開始生產，資料已上傳")
        handleProductionStarted(response[0].uuid)
        return
      }

      showError("開始生產失敗，後端未回傳生產ID")
    } catch (error) {
      console.error("upload failed: ", error)
      showError("資料上傳失敗")
    }
  }

  async function checkAndStartProduction() {
    if (options.isTestingMode.value || options.rowData.value.length === 0) return

    const allCorrect = options.rowData.value.every(
      (row) => row.correct === CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK
    )

    if (!allCorrect) return

    await showSuccess("所有物料已完成上料，準備進入正式生產...")
    await startProductionUpload()
  }

  async function onProduction() {
    const invalidRows = options.rowData.value.filter(
      (row) => !row.correct && !options.isTestingMode.value
    )
    if (invalidRows.length > 0) {
      return showError("尚有槽位未綁定，不能開始生產")
    }

    dialog.warning({
      title: "開始生產確認",
      content: "確定要開始生產嗎？",
      positiveText: "確定",
      negativeText: "取消",
      onPositiveClick: () => startProductionUpload(),
    })
  }

  function handleProductionStarted(productionStatUuid: string) {
    productionStarted.value = true
    productionUuid.value = productionStatUuid

    const newQuery: Record<string, any> = { ...route.query, uuid: productionStatUuid }
    delete newQuery.testing_mode
    delete newQuery.testing_product_idno

    router.replace({
      path: route.path,
      query: newQuery,
    })

    router.push(`/smt/fuji-mounter-production/${productionStatUuid}`)
  }

  async function onStopProduction() {
    if (!productionUuid.value) return showError("沒有生產ID，無法停止")

    dialog.warning({
      title: "停止生產確認",
      content: "確定要停止生產嗎？",
      positiveText: "確定",
      negativeText: "取消",
      onPositiveClick: async () => {
        try {
          await stopFujiProduction(productionUuid.value)
          productionStarted.value = false
          showSuccess("生產已結束")
          router.push("/smt/fuji-mounter/")
        } catch (error) {
          showError("停止生產失敗")
          console.error(error)
        }
      },
    })
  }

  return {
    productionUuid,
    productionStarted,
    checkAndStartProduction,
    onProduction,
    onStopProduction,
    startProductionUpload,
  }
}
