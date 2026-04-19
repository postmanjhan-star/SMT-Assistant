import { SmtService } from "@/client"
import type { MaterialQueryRowModel } from "@/domain/mounter/MaterialQueryRowModel"

export async function loadFujiMaterialQueryRows(
  uuid: string
): Promise<MaterialQueryRowModel[]> {
  const normalized = uuid?.toString().trim()
  if (!normalized) {
    throw new Error("uuid is required")
  }

  const logs = await SmtService.getTheFujiStatsOfLogsByUuid({ uuid: normalized })
  return logs.map((log) => ({
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
}
