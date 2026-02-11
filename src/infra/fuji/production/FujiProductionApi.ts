import type { FujiMounterFileRead, FujiMounterItemStatCreate } from "@/client"
import { SmtService } from "@/client"

export type LoadFujiProductionSlotsParams = {
    workOrderIdno: string
    mounterIdno: string
    productIdno: string
    boardSide: any
    testingMode: boolean
    testingProductIdno?: string | null
}

export async function fetchFujiProductionSlots(
    params: LoadFujiProductionSlotsParams
): Promise<FujiMounterFileRead[]> {
    return SmtService.getFujiMounterMaterialSlotPairs(params)
}

export async function startFujiProductionStats(
    payload: FujiMounterItemStatCreate[]
) {
    return SmtService.addFujiMounterItemStats({ requestBody: payload })
}

export async function stopFujiProductionStats(uuid: string) {
    return SmtService.updateFujiItemStatsEndTime({ uuid })
}
