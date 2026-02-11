import type { FujiMounterFileRead } from '@/client'
import {
    fetchFujiProductionSlots,
    type LoadFujiProductionSlotsParams,
} from '@/infra/fuji/production/FujiProductionApi'

export async function loadFujiProductionSlots(
    params: LoadFujiProductionSlotsParams
): Promise<FujiMounterFileRead[]> {
    return fetchFujiProductionSlots(params)
}
