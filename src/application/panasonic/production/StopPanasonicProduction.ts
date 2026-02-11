import { stopPanasonicProductionStats } from '@/infra/panasonic/production/PanasonicProductionApi'

export async function stopPanasonicProduction(uuid: string) {
    return stopPanasonicProductionStats({
        uuid,
        endTime: new Date().toISOString(),
    })
}
