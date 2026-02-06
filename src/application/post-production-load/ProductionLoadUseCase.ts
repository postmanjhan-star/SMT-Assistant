import {
    PanasonicItemStatFeedLogRead,
    PanasonicMounterItemStatRead,
    SmtService,
} from "@/client"
import {
    buildProductionRowData,
    type ProductionRowModel,
} from "@/domain/production/buildPanasonicRowData"

export type PanasonicProductionLoadResult = {
    mounterData: PanasonicMounterItemStatRead[]
    rowData: ProductionRowModel[]
    productionStarted: boolean
}

export async function loadPanasonicProduction(
    productionUuid: string
): Promise<PanasonicProductionLoadResult> {
    const uuid = productionUuid?.toString().trim()
    if (!uuid) {
        throw new Error("productionUuid is required")
    }

    const stats = await SmtService.getThePanasonicItemStatsOfProduction({ uuid })

    let logs: PanasonicItemStatFeedLogRead[] = []
    try {
        logs = await SmtService.getTheStatsOfLogsByUuid({ uuid })
    } catch {
        // logs 為輔助資料，允許失敗
    }

    return {
        mounterData: stats,
        rowData: buildProductionRowData(stats, logs),
        productionStarted: stats.length > 0 && stats[0].production_end == null,
    }
}
