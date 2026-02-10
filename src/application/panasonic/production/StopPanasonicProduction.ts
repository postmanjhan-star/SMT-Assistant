import { stopPanasonicProductionStats } from '@/infrastruture/panasonic/production/PanasonicProductionApi'

export async function stopPanasonicProduction(uuid: string) {
    return stopPanasonicProductionStats({
        uuid,
        endTime: new Date().toISOString(),
    })
}
