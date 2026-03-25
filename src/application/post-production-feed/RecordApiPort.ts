import type { PanasonicFeedRecordCreate } from '@/client'

export interface RecordApiPort {
  uploadFeedRecord(payload: PanasonicFeedRecordCreate): Promise<unknown>
  fetchMaterialInventory(materialInventoryIdno: string): Promise<unknown>
}
