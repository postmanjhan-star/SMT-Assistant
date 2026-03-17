import { SmtService } from '@/client'

export class FujiPostProductionRecordApi {
  async uploadFeedRecord(payload: any) {
    return SmtService.addFujiMounterItemStatRoll({ requestBody: payload })
  }

  async fetchMaterialInventory(materialInventoryIdno: string) {
    return SmtService.getMaterialInventoryForSmt({ materialInventoryIdno })
  }
}
