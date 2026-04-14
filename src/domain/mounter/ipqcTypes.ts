import type { CheckMaterialMatchEnum } from "@/client"

export type IpqcInspectionRecord = {
  slotIdno: string
  subSlotIdno?: string | null
  stage?: string
  slot?: number
  materialPackCode: string
  inspectorIdno: string
  inspectionTime: string
  checkPackCodeMatch?: CheckMaterialMatchEnum | null
}
