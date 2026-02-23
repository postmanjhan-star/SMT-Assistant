import { SmtService, type PanasonicMounterFileRead } from '@/client'

export type PanasonicMounterMaterialSlotParams = Parameters<
  typeof SmtService.getPanasonicMounterMaterialSlotPairs
>[0]

// Infra: Panasonic mounter slot pair fetch
export async function fetchPanasonicMounterMaterialSlotPairs(
  params: PanasonicMounterMaterialSlotParams
): Promise<PanasonicMounterFileRead> {
  return SmtService.getPanasonicMounterMaterialSlotPairs(params)
}
