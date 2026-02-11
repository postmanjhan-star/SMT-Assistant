import type { PanasonicMounterFileRead } from '@/client'
import {
  fetchPanasonicMounterMaterialSlotPairs,
  type PanasonicMounterMaterialSlotParams,
} from '@/infra/panasonic/PanasonicMounterMaterialSlotApi'

export async function loadPanasonicProductionSlots(
  params: PanasonicMounterMaterialSlotParams
): Promise<PanasonicMounterFileRead> {
  return fetchPanasonicMounterMaterialSlotPairs(params)
}
