import type { PanasonicMounterItemStatCreate } from '@/client'
import { startPanasonicProductionStats } from '@/infra/panasonic/production/PanasonicProductionApi'

export async function startPanasonicProduction(
    payload: PanasonicMounterItemStatCreate[]
) {
    return startPanasonicProductionStats(payload)
}
