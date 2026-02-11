import { stopFujiProductionStats } from '@/infra/fuji/production/FujiProductionApi'

export async function stopFujiProduction(uuid: string) {
    return stopFujiProductionStats(uuid)
}
