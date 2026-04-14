/* eslint-disable no-restricted-imports -- [Phase-1 whitelist] tracked in REFACTORING_BASELINE.md, fix in Phase 3 */
import { ref, type Ref } from "vue"
import { useDialog } from "naive-ui"
import {
  CheckMaterialMatchEnum,
  FeedMaterialTypeEnum,
  MaterialOperationTypeEnum,
  UnfeedMaterialTypeEnum,
  ProduceTypeEnum,
  SmtService,
  type BoardSideEnum,
  type MachineSideEnum,
  type PanasonicMounterItemStatCreate,
  type PanasonicMounterItemStatRead,
  type UnfeedReasonEnum,
} from "@/client"
import { useUiNotifier } from "@/ui/shared/composables/useUiNotifier"
import { ProductionLifecycleUseCase } from "@/application/preproduction/ProductionLifecycleUseCase"
import { StartProductionStatsUseCase } from "@/application/preproduction/StartProductionStatsUseCase"
import { useProductionLifecycleUi } from "@/ui/shared/composables/useProductionLifecycleUi"
import type { IpqcInspectionRecord } from "@/domain/mounter/ipqcTypes"
import type {
  PanasonicUnloadRecord,
  PanasonicSpliceRecord,
} from "@/ui/shared/composables/panasonic/panasonicDetailTypes"
import type { ProductionRowModel } from "@/pages/mounter/panasonic/types/production"

export type { PanasonicUnloadRecord, PanasonicSpliceRecord }

export type UsePanasonicPreproductionLifecycleOptions = {
  rowData: Ref<ProductionRowModel[]>
  isTestingMode: boolean
  workOrderIdno: Ref<string>
  productIdno: Ref<string>
  mounterIdno: Ref<string>
  machineSideQuery: Ref<string>
  workSheetSideQuery: Ref<string>
  getOperatorId?: () => string | null
  getPendingUnloadRecords?: () => PanasonicUnloadRecord[]
  onUnloadUploaded?: (ok: boolean) => void
  getPendingSpliceRecords?: () => PanasonicSpliceRecord[]
  getPendingIpqcRecords?: () => IpqcInspectionRecord[]
  onIpqcUploaded?: (ok: boolean) => void
  startProduction: (payload: PanasonicMounterItemStatCreate[]) => Promise<PanasonicMounterItemStatRead[]>
  stopProduction: (uuid: string) => Promise<unknown>
}

type PanasonicStartStatPayload = PanasonicMounterItemStatCreate & {
  feed_material_pack_type?: FeedMaterialTypeEnum
  operation_type?: MaterialOperationTypeEnum
}

function makeSlotKey(slot: string, subSlot?: string | null) {
  if (subSlot && subSlot.trim() !== "") {
    return `${slot}-${subSlot.trim()}`
  }
  return slot
}

export function usePanasonicPreproductionLifecycle(
  options: UsePanasonicPreproductionLifecycleOptions
) {
  const dialog = useDialog()
  const { error: showError } = useUiNotifier()

  const productionUuid = ref("")
  const productionStarted = ref(false)
  const productionLoading = ref(false)

  const lifecycleUseCase = new ProductionLifecycleUseCase({
    start: (uuid) => {
      productionStarted.value = true
      productionUuid.value = uuid
    },
    stop: async () => {
      await options.stopProduction(productionUuid.value)
      productionStarted.value = false
    },
    buildProductionPath: (uuid) => `/smt/panasonic-mounter-production/${uuid}`,
  })

  const { handleProductionStarted, onStopProduction } = useProductionLifecycleUi({
    lifecycleUseCase,
    productionUuid,
  })

  const startStatsUseCase = new StartProductionStatsUseCase<
    ProductionRowModel,
    PanasonicUnloadRecord,
    PanasonicSpliceRecord,
    IpqcInspectionRecord
  >({
    startProduction: async (rows) => {
      const now = new Date().toISOString()
      const machineSide =
        options.machineSideQuery.value === "1"
          ? ("FRONT" as MachineSideEnum)
          : options.machineSideQuery.value === "2"
            ? ("BACK" as MachineSideEnum)
            : null
      const boardSide = options.workSheetSideQuery.value as BoardSideEnum | null

      const payload: PanasonicStartStatPayload[] = rows.map((row) => ({
        operator_id: options.getOperatorId?.() ?? null,
        operation_time: row.operationTime
          ? new Date(row.operationTime).toISOString()
          : now,
        production_start: now,
        work_order_no: options.workOrderIdno.value,
        product_idno: options.productIdno.value,
        machine_idno: options.mounterIdno.value,
        machine_side: machineSide,
        board_side: boardSide,
        slot_idno: row.slotIdno,
        sub_slot_idno: row.subSlotIdno ?? null,
        material_idno: row.materialIdno ?? null,
        material_pack_code: row.materialInventoryIdno ?? null,
        feed_material_pack_type: FeedMaterialTypeEnum.IMPORTED_MATERIAL_PACK,
        operation_type: MaterialOperationTypeEnum.FEED,
        produce_mode: options.isTestingMode
          ? ProduceTypeEnum.TESTING_PRODUCE_MODE
          : ProduceTypeEnum.NORMAL_PRODUCE_MODE,
        check_pack_code_match: row.correct as unknown as CheckMaterialMatchEnum,
      }))

      const response = await options.startProduction(payload)
      if (!response?.length || !response[0].uuid) throw new Error("開始生產失敗")

      const statItemMap = new Map<string, number>()
      response.forEach((stat) =>
        statItemMap.set(makeSlotKey(stat.slot_idno, stat.sub_slot_idno), stat.id)
      )
      return { productionUuid: response[0].uuid, statItemMap }
    },
    uploadUnload: async (record, statItemMap) => {
      const id = statItemMap.get(makeSlotKey(record.slotIdno, record.subSlotIdno))
      if (id === undefined) return
      await SmtService.addPanasonicMounterItemStatRoll({
        requestBody: {
          stat_item_id: id,
          operator_id: null,
          operation_time: record.operationTime,
          slot_idno: record.slotIdno,
          sub_slot_idno: record.subSlotIdno ?? null,
          material_pack_code: record.materialPackCode,
          operation_type: MaterialOperationTypeEnum.UNFEED,
          unfeed_material_pack_type: UnfeedMaterialTypeEnum.PARTIAL_UNFEED,
          unfeed_reason: (record.unfeedReason as UnfeedReasonEnum) ?? null,
          check_pack_code_match: record.checkPackCodeMatch ?? null,
        },
      })
    },
    uploadSplice: async (record, statItemMap) => {
      const id = statItemMap.get(makeSlotKey(record.slotIdno, record.subSlotIdno))
      if (id === undefined) return
      await SmtService.addPanasonicMounterItemStatRoll({
        requestBody: {
          stat_item_id: id,
          operator_id: null,
          operation_time: record.operationTime,
          slot_idno: record.slotIdno,
          sub_slot_idno: record.subSlotIdno ?? null,
          material_pack_code: record.materialPackCode,
          operation_type: MaterialOperationTypeEnum.FEED,
          feed_material_pack_type: FeedMaterialTypeEnum.NEW_MATERIAL_PACK,
          check_pack_code_match: record.correctState as CheckMaterialMatchEnum,
          unfeed_reason: null,
        },
      })
    },
    uploadIpqc: async (record, statItemMap) => {
      const id = statItemMap.get(makeSlotKey(record.slotIdno, record.subSlotIdno))
      if (id === undefined) return
      await SmtService.addPanasonicMounterItemStatRoll({
        requestBody: {
          stat_item_id: id,
          operator_id: record.inspectorIdno || null,
          operation_time: record.inspectionTime,
          slot_idno: record.slotIdno,
          sub_slot_idno: record.subSlotIdno ?? null,
          material_pack_code: record.materialPackCode,
          operation_type: MaterialOperationTypeEnum.FEED,
          feed_material_pack_type: FeedMaterialTypeEnum.INSPECTION_MATERIAL_PACK,
          check_pack_code_match: record.checkPackCodeMatch ?? CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK,
          unfeed_reason: null,
        },
      })
    },
  })

  async function startProductionUpload(rows?: ProductionRowModel[]) {
    if (productionLoading.value) return
    productionLoading.value = true
    try {
      const uuid = await startStatsUseCase.execute({
        rowData: rows ?? options.rowData.value,
        pendingUnloadRecords: options.getPendingUnloadRecords?.() ?? [],
        pendingSpliceRecords: options.getPendingSpliceRecords?.() ?? [],
        pendingIpqcRecords: options.getPendingIpqcRecords?.() ?? [],
        onUnloadUploaded: options.onUnloadUploaded,
        onIpqcUploaded: options.onIpqcUploaded,
      })
      handleProductionStarted(uuid)
    } catch {
      showError("資料上傳失敗")
    } finally {
      productionLoading.value = false
    }
  }

  async function onProduction() {
    const invalid = options.rowData.value.filter((r) => {
      if (r.correct === "false") return true
      if (r.correct === "unloaded") return true
      if (!options.isTestingMode && r.correct == null) return true
      return false
    })

    if (invalid.length > 0) {
      showError(
        options.isTestingMode
          ? "尚有槽位不匹配，不能開始生產"
          : "尚有槽位未確認或不匹配，不能開始生產"
      )
      return
    }

    dialog.warning({
      title: "開始生產確認",
      content: "確定要開始生產嗎？",
      positiveText: "確定",
      negativeText: "取消",
      onPositiveClick: () => startProductionUpload(),
      onNegativeClick: () => {},
    })
  }

  return {
    productionUuid,
    productionStarted,
    productionLoading,
    onProduction,
    onStopProduction,
    startProductionUpload,
  }
}
