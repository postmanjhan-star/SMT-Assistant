import { CheckMaterialMatchEnum, type PanasonicFeedRecordCreate } from '@/client'
import { PostProductionFeedUploader } from './PostProductionFeedUploader'
import type { FujiRecordApiPort } from './FujiRecordApiPort'

export class FujiPostProductionRecordUploader extends PostProductionFeedUploader {
  constructor(private api: FujiRecordApiPort) {
    super()
  }

  protected doUpload(payload: PanasonicFeedRecordCreate) {
    return this.api.uploadFeedRecord(payload)
  }

  protected doFetchMaterialInventory(id: string) {
    return this.api.fetchMaterialInventory(id)
  }

  fetchProductionStats(uuid: string) { return this.api.fetchProductionStats(uuid) }
  fetchFeedLogs(uuid: string) { return this.api.fetchFeedLogs(uuid) }
  stopProduction(uuid: string) { return this.api.stopProduction(uuid) }

  // Default uploadAppend to NEW_MATERIAL_PACK and MATCHED_MATERIAL_PACK when not specified
  override async uploadAppend(params: {
    statId: number
    slotIdno: string
    subSlotIdno?: string | null
    materialPackCode: string
    correctState?: CheckMaterialMatchEnum | null
    feedMaterialPackType?: string | null
    operatorId?: string | null
  }) {
    return super.uploadAppend({
      ...params,
      correctState: params.correctState ?? CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK,
    })
  }
}
