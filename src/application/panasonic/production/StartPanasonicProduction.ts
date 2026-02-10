import type { PanasonicMounterItemStatCreate } from '@/client'
import { startPanasonicProductionStats } from '@/infrastruture/panasonic/production/PanasonicProductionApi'

export async function startPanasonicProduction(
    payload: PanasonicMounterItemStatCreate[]
) {
    return startPanasonicProductionStats(payload)
}
