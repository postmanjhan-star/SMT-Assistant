import type { FujiMounterItemStatRead, FujiItemStatFeedLogRead, PanasonicFeedRecordCreate } from '@/client'

export interface FujiRecordApiPort {
  uploadFeedRecord(payload: PanasonicFeedRecordCreate): Promise<unknown>
  fetchMaterialInventory(materialInventoryIdno: string): Promise<unknown>
  fetchProductionStats(uuid: string): Promise<FujiMounterItemStatRead[]>
  fetchFeedLogs(uuid: string): Promise<FujiItemStatFeedLogRead[]>
  stopProduction(uuid: string): Promise<void>
}
