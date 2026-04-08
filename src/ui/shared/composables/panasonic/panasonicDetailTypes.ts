import type { IpqcInspectionRecord } from "@/domain/mounter/ipqcTypes"

export type PanasonicUnloadRecord = {
  slotIdno: string
  subSlotIdno?: string | null
  materialPackCode: string
  unfeedReason?: string | null
  operationTime: string
}

export type PanasonicSpliceRecord = {
  slotIdno: string
  subSlotIdno?: string | null
  materialPackCode: string
  correctState: "MATCHED_MATERIAL_PACK" | "TESTING_MATERIAL_PACK"
  operationTime: string
}

export type PanasonicCacheRow = {
  id?: number
  slotIdno?: string
  subSlotIdno?: string | null
  correct?: unknown
  operatorIdno?: string | null
  materialInventoryIdno?: string | null
  appendedMaterialInventoryIdno?: string | null
  spliceMaterialInventoryIdno?: string | null
  operationTime?: string | null
  remark?: string
}

export type PanasonicCachePayload = {
  version: 1
  rows: PanasonicCacheRow[]
  unloadRecords?: PanasonicUnloadRecord[]
  spliceRecords?: PanasonicSpliceRecord[]
  ipqcRecords?: IpqcInspectionRecord[]
  materialInventoryResult?: {
    success: boolean
    materialInventory?: { idno: string; remark?: string } | null
    matchedRows?: { slotIdno: string; subSlotIdno?: string | null }[] | null
  } | null
  inputs?: {
    material?: string
    slot?: string
  }
}
