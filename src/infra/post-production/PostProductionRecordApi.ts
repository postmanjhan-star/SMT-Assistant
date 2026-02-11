import { SmtService, type PanasonicFeedRecordCreate } from '@/client'

// Infra: API calls for post-production records
export class PostProductionRecordApi {
  async uploadFeedRecord(payload: PanasonicFeedRecordCreate) {
    return SmtService.addPanasonicMounterItemStatRoll({ requestBody: payload })
  }

  async fetchMaterialInventory(materialInventoryIdno: string) {
    return SmtService.getMaterialInventoryForSmt({ materialInventoryIdno })
  }
}
