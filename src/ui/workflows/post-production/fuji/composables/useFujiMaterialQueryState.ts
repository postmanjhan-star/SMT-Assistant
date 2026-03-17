import { ref, type Ref } from "vue"
import { SmtService } from "@/client"
import type { MaterialQueryRowModel } from "@/domain/mounter/MaterialQueryRowModel"

export function useFujiMaterialQueryState(uuid: Ref<string>) {
  const rowData = ref<MaterialQueryRowModel[]>([])

  const load = async () => {
    const normalized = uuid.value?.toString().trim()
    if (!normalized) return rowData.value

    const logs = await SmtService.getTheFujiStatsOfLogsByUuid({ uuid: normalized })
    rowData.value = logs.map((log) => ({
      id: log.id,
      correct: log.check_pack_code_match,
      slotIdno: log.slot_idno,
      subSlotIdno: log.sub_slot_idno,
      materialInventoryIdno: log.material_pack_code,
      materialInventoryType: log.feed_material_pack_type,
      operatorName: log.operator_id ?? "",
      checktime: log.operation_time,
      remark: log.check_pack_code_match === "TESTING_MATERIAL_PACK" ? "[廠商測試新料]" : "",
    }))
    return rowData.value
  }

  return { rowData, load }
}
