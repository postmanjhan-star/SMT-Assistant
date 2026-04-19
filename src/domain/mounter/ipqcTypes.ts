export type CheckMaterialMatchValue =
  | "MATCHED_MATERIAL_PACK"
  | "TESTING_MATERIAL_PACK"
  | "UNMATCHED_MATERIAL_PACK"
  | "UNCHECKED_MATERIAL_PACK"

export type IpqcInspectionRecord = {
  slotIdno: string
  subSlotIdno?: string | null
  stage?: string
  slot?: number
  materialPackCode: string
  inspectorIdno: string
  inspectionTime: string
  checkPackCodeMatch?: CheckMaterialMatchValue | null
}
