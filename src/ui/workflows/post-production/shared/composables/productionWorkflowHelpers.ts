import { CheckMaterialMatchEnum } from "@/application/post-production-feed/clientTypes"
import { ProduceTypeEnum } from "@/application/preproduction/clientTypes"
import type { PostProductionCorrectState } from "@/stores/postProductionFeedStore"

export const normalizeRoute = (val: unknown): string => String(val ?? "").trim()

export const mapTestingModeToProduceType = (
  value: boolean | null,
): ProduceTypeEnum | null => {
  if (value == null) return null
  return value
    ? ProduceTypeEnum.TESTING_PRODUCE_MODE
    : ProduceTypeEnum.NORMAL_PRODUCE_MODE
}

export function mapCorrectStateToEnum(
  value: PostProductionCorrectState | null | undefined,
): CheckMaterialMatchEnum | null {
  if (value === "true") return CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK
  if (value === "false") return CheckMaterialMatchEnum.UNMATCHED_MATERIAL_PACK
  if (value === "warning") return CheckMaterialMatchEnum.TESTING_MATERIAL_PACK
  return null
}
