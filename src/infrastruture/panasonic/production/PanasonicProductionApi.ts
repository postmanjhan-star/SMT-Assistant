import type { PanasonicMounterItemStatCreate } from '@/client'
import { SmtService } from '@/client'

export async function startPanasonicProductionStats(
    payload: PanasonicMounterItemStatCreate[]
) {
    return SmtService.addPanasonicMounterItemStats({ requestBody: payload })
}

export async function stopPanasonicProductionStats(input: {
    uuid: string
    endTime?: string | null
}) {
    return SmtService.updateTheStatsOfProductionEndTimeRecord({
        uuid: input.uuid,
        endTime: input.endTime ?? null,
    })
}
