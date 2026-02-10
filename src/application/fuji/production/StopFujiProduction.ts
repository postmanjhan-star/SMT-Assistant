import { stopFujiProductionStats } from '@/infrastruture/fuji/production/FujiProductionApi'

export async function stopFujiProduction(uuid: string) {
    return stopFujiProductionStats(uuid)
}
