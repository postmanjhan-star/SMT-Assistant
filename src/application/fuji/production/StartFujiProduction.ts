import type { FujiMounterItemStatCreate } from '@/client'
import { startFujiProductionStats } from '@/infrastruture/fuji/production/FujiProductionApi'

export async function startFujiProduction(
    payload: FujiMounterItemStatCreate[]
) {
    return startFujiProductionStats(payload)
}
