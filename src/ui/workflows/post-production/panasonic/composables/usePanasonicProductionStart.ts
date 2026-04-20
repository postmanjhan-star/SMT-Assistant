import type { Ref, ComputedRef } from "vue"
import type { RouteLocationNormalizedLoaded, Router } from "vue-router"
import type { DialogApi } from "naive-ui"
import { CheckMaterialMatchEnum } from "@/application/post-production-feed/clientTypes"
import { MachineSideEnum } from "@/application/preproduction/clientTypes"
import type {
  BoardSideEnum,
  PanasonicMounterItemStatCreate,
} from "@/application/preproduction/clientTypes"
import type { ProductionRowModel } from "@/domain/production/buildPanasonicRowData"
import {
  mapTestingModeToProduceType,
  normalizeRoute,
} from "@/ui/workflows/post-production/shared/composables/productionWorkflowHelpers"
import { msg } from "@/ui/shared/messageCatalog"

export type PanasonicProductionStartDeps = {
  route: RouteLocationNormalizedLoaded
  router: Router
  dialog: DialogApi
  ui: {
    success: (msg: string) => void
    error: (msg: string) => void
  }
  rowData: Ref<ProductionRowModel[]>
  productionStarted: Ref<boolean>
  isTestingMode: Ref<boolean>
  machineSide: Ref<MachineSideEnum | null>
  boardSide: Ref<BoardSideEnum | null>
  mounterIdno: ComputedRef<string>
  startPanasonicProduction: (payload: PanasonicMounterItemStatCreate[]) => Promise<unknown>
}

export function usePanasonicProductionStart(deps: PanasonicProductionStartDeps) {
  const {
    route, router, dialog, ui,
    rowData, productionStarted, isTestingMode,
    machineSide, boardSide, mounterIdno,
    startPanasonicProduction,
  } = deps

  const convertBoardSide = (value: string | null): BoardSideEnum | null =>
    value as unknown as BoardSideEnum

  const startProductionUpload = async (testing: boolean) => {
    const machineSideValue = normalizeRoute(route.query.machine_side)
    machineSide.value =
      machineSideValue === "1"
        ? MachineSideEnum.FRONT
        : machineSideValue === "2"
          ? MachineSideEnum.BACK
          : null

    boardSide.value = convertBoardSide(
      normalizeRoute(route.query.work_sheet_side ?? null)
    )

    try {
      const payload: PanasonicMounterItemStatCreate[] = rowData.value.map((row) => ({
        operator_id: null,
        operation_time: row.operationTime
          ? new Date(row.operationTime).toISOString()
          : new Date().toISOString(),
        production_start: new Date().toISOString(),
        work_order_no: normalizeRoute(route.params.workOrderIdno ?? null),
        product_idno: normalizeRoute(route.query.product_idno),
        machine_idno: mounterIdno.value,
        machine_side: machineSide.value,
        board_side: boardSide.value,
        slot_idno: row.slotIdno,
        sub_slot_idno: row.subSlotIdno ?? null,
        material_idno: row.materialIdno ?? null,
        material_pack_code: row.materialInventoryIdno ?? null,
        produce_mode: mapTestingModeToProduceType(testing),
        check_pack_code_match:
          row.correct === "UNLOADED_MATERIAL_PACK"
            ? null
            : (row.correct as CheckMaterialMatchEnum | null),
      }))

      await startPanasonicProduction(payload)

      ui.success(msg.production.startedAndUploaded)
      productionStarted.value = true

      router.replace({
        path: route.path,
        query: {
          ...route.query,
        },
      })
    } catch (err) {
      console.error("upload failed: ", err)
      ui.error("上傳失敗")
    }
  }

  const onProduction = () => {
    const invalid = rowData.value.filter((row) => {
      if (row.correct === CheckMaterialMatchEnum.UNMATCHED_MATERIAL_PACK) return true
      if (row.correct === "UNLOADED_MATERIAL_PACK") return true
      if (!isTestingMode.value && row.correct == null) return true
      return false
    })

    if (invalid.length > 0) {
      return ui.error("尚有槽位未綁定或錯誤，無法開始生產")
    }

    dialog.warning({
      title: "開始生產確認",
      content: "確定要開始生產嗎？",
      positiveText: "確定",
      negativeText: "取消",
      onPositiveClick: () => startProductionUpload(isTestingMode.value),
      onNegativeClick: () => {},
    })
  }

  return { onProduction, startProductionUpload }
}
