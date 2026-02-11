import type { FujiMounterItemStatCreate } from '@/client'
import { startFujiProductionStats } from '@/infra/fuji/production/FujiProductionApi'

export async function startFujiProduction(
    payload: FujiMounterItemStatCreate[]
) {
    return startFujiProductionStats(payload)
}
