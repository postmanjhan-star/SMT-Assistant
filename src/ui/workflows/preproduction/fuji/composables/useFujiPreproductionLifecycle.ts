import { ref, type Ref } from "vue"
import { useDialog } from "naive-ui"
import { useRouter } from "vue-router"
import { useProductionLifecycleUi } from "@/ui/shared/composables/useProductionLifecycleUi"
import {
  CheckMaterialMatchEnum,
  FeedMaterialTypeEnum,
  MaterialOperationTypeEnum,
  UnfeedMaterialTypeEnum,
  ProduceTypeEnum,
  SmtService,
  type BoardSideEnum,
  type FujiMounterItemStatCreate,
  type UnfeedReasonEnum,
} from "@/client"
import { useUiNotifier } from "@/ui/shared/composables/useUiNotifier"
import { startFujiProduction } from "@/application/fuji/production/StartFujiProduction"
import { stopFujiProduction } from "@/application/fuji/production/StopFujiProduction"
import { ProductionLifecycleUseCase } from "@/application/preproduction/ProductionLifecycleUseCase"
import { StartProductionStatsUseCase } from "@/application/preproduction/StartProductionStatsUseCase"
import type { FujiMounterRowModel } from "@/ui/workflows/preproduction/fuji/composables/useFujiProductionState"

export type FujiUnloadRecord = {
  slot: number
  stage: string
  materialPackCode: string
  unfeedReason?: string | null
  operationTime: string
}

export type FujiSpliceRecord = {
  slot: number
  stage: string
  materialPackCode: string
  correctState: CheckMaterialMatchEnum
  operationTime: string
}

export type UseFujiPreproductionLifecycleOptions = {
  rowData: Ref<FujiMounterRowModel[]>
  workOrderIdno: Ref<string>
  productIdno: Ref<string>
  boardSide: Ref<BoardSideEnum>
  isTestingMode: Ref<boolean>
  getPendingUnloadRecords?: () => FujiUnloadRecord[]
  onUnloadUploaded?: (ok: boolean) => void
  getPendingSpliceRecords?: () => FujiSpliceRecord[]
}

type FujiStartStatPayload = FujiMounterItemStatCreate & {
  feed_material_pack_type?: FeedMaterialTypeEnum
  operation_type?: MaterialOperationTypeEnum
}

export function useFujiPreproductionLifecycle(
  options: UseFujiPreproductionLifecycleOptions
) {
  const router = useRouter()
  const dialog = useDialog()
  const { success: showSuccess, error: showError } = useUiNotifier()

  const productionUuid = ref("")
  const productionStarted = ref(false)

  const lifecycleUseCase = new ProductionLifecycleUseCase({
    start: (uuid) => {
      productionStarted.value = true
      productionUuid.value = uuid
    },
    stop: async () => {
      await stopFujiProduction(productionUuid.value)
      productionStarted.value = false
    },
    buildProductionPath: (uuid) => `/smt/fuji-mounter-production/${uuid}`,
    extraQueryParamsToRemove: ["testing_mode", "testing_product_idno"],
  })

  const { handleProductionStarted, onStopProduction } = useProductionLifecycleUi({
    lifecycleUseCase,
    productionUuid,
    afterStop: () => router.push("/smt/fuji-mounter/"),
  })

  const startStatsUseCase = new StartProductionStatsUseCase<
    FujiMounterRowModel,
    FujiUnloadRecord,
    FujiSpliceRecord
  >({
    startProduction: async (rows) => {
      const now = new Date().toISOString()
      const payload: FujiStartStatPayload[] = rows.map((row) => ({
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
        operation_time: now,
        production_start: now,
      }))
      const response = await startFujiProduction(payload)
      if (!response?.length || !response[0].uuid)
        throw new Error("開始生產失敗，後端未回傳生產ID")
      const statItemMap = new Map<string, number>()
      response.forEach((stat) =>
        statItemMap.set(`${stat.slot_idno}-${stat.sub_slot_idno}`, stat.id)
      )
      return { productionUuid: response[0].uuid, statItemMap }
    },
    uploadUnload: async (record, statItemMap) => {
      const id = statItemMap.get(`${record.slot}-${record.stage}`)
      if (id === undefined) return
      await SmtService.addFujiMounterItemStatRoll({
        requestBody: {
          stat_item_id: id,
          operator_id: null,
          operation_time: record.operationTime,
          slot_idno: String(record.slot),
          sub_slot_idno: record.stage,
          material_pack_code: record.materialPackCode,
          operation_type: MaterialOperationTypeEnum.UNFEED,
          unfeed_material_pack_type: UnfeedMaterialTypeEnum.PARTIAL_UNFEED,
          unfeed_reason: (record.unfeedReason as UnfeedReasonEnum) ?? null,
          check_pack_code_match: null,
        },
      })
    },
    uploadSplice: async (record, statItemMap) => {
      const id = statItemMap.get(`${record.slot}-${record.stage}`)
      if (id === undefined) return
      await SmtService.addFujiMounterItemStatRoll({
        requestBody: {
          stat_item_id: id,
          operator_id: null,
          operation_time: record.operationTime,
          slot_idno: String(record.slot),
          sub_slot_idno: record.stage,
          material_pack_code: record.materialPackCode,
          operation_type: MaterialOperationTypeEnum.FEED,
          feed_material_pack_type: FeedMaterialTypeEnum.NEW_MATERIAL_PACK,
          check_pack_code_match: record.correctState,
          unfeed_reason: null,
        },
      })
    },
  })

  async function startProductionUpload() {
    try {
      const productionUuid = await startStatsUseCase.execute({
        rowData: options.rowData.value,
        pendingUnloadRecords: options.getPendingUnloadRecords?.() ?? [],
        pendingSpliceRecords: options.getPendingSpliceRecords?.() ?? [],
        onUnloadUploaded: options.onUnloadUploaded,
      })
      showSuccess("開始生產，資料已上傳")
      handleProductionStarted(productionUuid)
    } catch (error) {
      console.error("upload failed: ", error)
      showError(error instanceof Error ? error.message : "資料上傳失敗")
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


  return {
    productionUuid,
    productionStarted,
    checkAndStartProduction,
    onProduction,
    onStopProduction,
    startProductionUpload,
  }
}
