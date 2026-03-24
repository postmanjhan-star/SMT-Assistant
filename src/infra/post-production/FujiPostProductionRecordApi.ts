import { SmtService, type FujiMounterItemStatRead, type FujiItemStatFeedLogRead } from '@/client'

export class FujiPostProductionRecordApi {
  async uploadFeedRecord(payload: any) {
    return SmtService.addFujiMounterItemStatRoll({ requestBody: payload })
  }

  async fetchMaterialInventory(materialInventoryIdno: string) {
    return SmtService.getMaterialInventoryForSmt({ materialInventoryIdno })
  }

  async fetchProductionStats(uuid: string): Promise<FujiMounterItemStatRead[]> {
    return SmtService.getTheFujiItemStatsOfProduction({ uuid })
  }

  async fetchFeedLogs(uuid: string): Promise<FujiItemStatFeedLogRead[]> {
    return SmtService.getTheFujiStatsOfLogsByUuid({ uuid })
  }

  async stopProduction(uuid: string): Promise<void> {
    await SmtService.updateFujiItemStatsEndTime({ uuid })
  }
}
