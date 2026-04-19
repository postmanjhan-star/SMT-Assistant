import type { CheckMaterialMatchEnum } from "@/application/post-production-feed/clientTypes"
import type { IpqcInspectionRecord } from "@/domain/mounter/ipqcTypes"

export type FujiPreproductionUnloadRecord = {
  slot: number
  stage: string
  materialPackCode: string
  unfeedReason?: string | null
  operationTime: string
  checkPackCodeMatch?: CheckMaterialMatchEnum | null
}

export type FujiPreproductionSpliceRecord = {
  slot: number
  stage: string
  materialPackCode: string
  correctState: "MATCHED_MATERIAL_PACK" | "TESTING_MATERIAL_PACK"
  operationTime: string
}

export type FujiPreproductionCacheRow = {
  id?: number
  key?: string
  correct?: unknown
  operatorIdno?: string | null
  materialInventoryIdno?: string | null
  appendedMaterialInventoryIdno?: string
  spliceMaterialInventoryIdno?: string | null
  remark?: string
}

export type FujiMaterialInventoryCache = {
  id?: number | null
  idno: string
  material_id?: number | null
  material_idno: string
  material_name?: string
}

export type FujiPreproductionCachePayload = {
  version: 1
  rows: FujiPreproductionCacheRow[]
  unloadRecords?: FujiPreproductionUnloadRecord[]
  spliceRecords?: FujiPreproductionSpliceRecord[]
  ipqcRecords?: IpqcInspectionRecord[]
  materialInventory?: FujiMaterialInventoryCache | null
  inputs?: {
    material?: string
    slot?: string
  }
}
