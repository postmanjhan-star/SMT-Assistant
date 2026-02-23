import { storeToRefs } from "pinia"
import { ref } from "vue"
import type { FormInst } from "naive-ui"
import type { PanasonicMounterItemStatRead } from "@/client"
import {
  MODE_NAME_TESTING,
} from "@/application/post-production-feed/PostProductionFeedConstants"
import {
  fetchMaterialInventoryForSmt,
  uploadAppendRecord,
} from "@/application/post-production-feed/PostProductionFeedRecordUseCase"
import { parseSlotIdno } from "@/domain/production/PostProductionFeedRecord"
import { usePostProductionFeedStore } from "@/stores/postProductionFeedStore"
import {
  SubmitPanasonicRollShortageUseCase,
  type PanasonicRollShortageError,
} from "@/application/panasonic/roll-shortage/SubmitPanasonicRollShortageUseCase"

export type RollShortageFormValue = {
  materialInventoryIdno: string
  slotIdno: string
  type: string
}

export type useRollShortageFormOptions<
  TRow extends {
    slotIdno: string
    subSlotIdno?: string | null
    materialIdno: string
    appendedMaterialInventoryIdno: string
  }
> = {
  getMounterData: () => PanasonicMounterItemStatRead[]
  getRowData: () => TRow[]
  isTestingMode: () => boolean
  getOperatorId?: () => string | null
}

function toErrorMessage(error: PanasonicRollShortageError): string {
  switch (error.code) {
    case "materialInventoryIdno_required":
      return "請輸入物料號"
    case "slotIdno_required":
      return "請輸入槽位"
    case "type_required":
      return "請選擇物料類型"
    case "stat_not_found":
      return "找不到對應的槽位的資料"
    case "row_not_found":
      return `找不到表格槽位 ${error.slotIdno}`
    case "no_material_in_grid":
      return "表格內無此物料"
    case "inventory_not_found":
      return "查無此條碼"
    case "erp_timeout":
      return "ERP 連線超時，請確認 ERP 連線"
    case "erp_bad_gateway":
      return "ERP 連線錯誤，請確認 ERP 連線"
    case "server_error":
      return "系統錯誤"
    case "unknown_api_error":
      return "未知錯誤"
    case "unknown_error":
      return "發生未知例外"
  }
}

export function useRollShortageForm<
  TRow extends {
    slotIdno: string
    subSlotIdno?: string | null
    materialIdno: string
    appendedMaterialInventoryIdno: string
  }
>(options: useRollShortageFormOptions<TRow>) {
  const store = usePostProductionFeedStore()
  const rollShortageFormRef = ref<FormInst | null>(null)
  const { showRollShortageModal, rollShortageFormValue } = storeToRefs(store)

  const onRollShortage = () => {
    store.openRollShortageModal()
  }

  const getMaterialMatchedRows = (materialIdno: string): TRow[] => {
    return options
      .getRowData()
      .filter((row) => row.materialIdno === materialIdno)
  }

  const submitRollShortageUseCase = new SubmitPanasonicRollShortageUseCase<TRow>({
    getRowData: () => options.getRowData(),
    getStatBySlotIdno: (inputSlotIdno) => {
      const { slotIdno: inputSlot, subSlotIdno: inputSubSlot } =
        parseSlotIdno(inputSlotIdno)

      const stat = options.getMounterData().find(
        (candidate) =>
          candidate.slot_idno === inputSlot &&
          (candidate.sub_slot_idno ?? "") === inputSubSlot
      )

      if (!stat) return null
      return { id: stat.id }
    },
    fetchMaterialInventory: fetchMaterialInventoryForSmt,
    uploadRollRecord: (input) =>
      uploadAppendRecord({
        statId: input.statId,
        slotIdno: input.slotIdno,
        subSlotIdno: input.subSlotIdno ?? null,
        materialPackCode: input.materialPackCode,
        feedMaterialPackType: input.feedMaterialPackType,
        correctState: (input.checkPackCodeMatch ??
          null) as "true" | "false" | "warning" | null,
        operatorId: input.operatorId ?? "",
      }),
    isTestingMode: () => options.isTestingMode(),
    operatorId: () => options.getOperatorId?.() ?? "",
    now: () => new Date().toISOString(),
    matchRowsByMaterialIdno: (rows, materialIdno) =>
      rows.filter((row) => row.materialIdno === materialIdno),
    resolveRowId: (row) => store.getRowId(row),
  })

  const onSubmitShortage = async () => {
    try {
      await rollShortageFormRef.value?.validate()
    } catch {
      return
    }

    const result = await submitRollShortageUseCase.execute({
      materialInventoryIdno: rollShortageFormValue.value.materialInventoryIdno,
      slotIdno: rollShortageFormValue.value.slotIdno,
      type: rollShortageFormValue.value.type,
    })

    if (result.ok === false) {
      if (result.error.code === "no_material_in_grid") {
        await store.playErrorTone()
      }

      await store.error(toErrorMessage(result.error))
      return
    }

    if (result.info?.code === "testing_virtual_material") {
      store.info(`${MODE_NAME_TESTING}：使用物料 [廠商測試新料] ${result.info.idno}`)
    }

    await store.success("新增成功")

    const updated = store.setAppendedMaterialInventoryIdno(
      result.update.rowId,
      result.update.newAppendedMaterialInventoryIdno
    )

    if (!updated) {
      await store.error(`找不到AG Grid 資料列 ${result.update.rowId}`)
      return
    }

    store.closeRollShortageModal()
    store.resetRollShortageForm()
  }

  return {
    rollShortageFormRef,
    rollShortageFormValue,
    showRollShortageModal,
    onRollShortage,
    onSubmitShortage,
    getMaterialMatchedRows,
  }
}
