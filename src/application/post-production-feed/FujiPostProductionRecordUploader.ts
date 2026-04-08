import type { PanasonicFeedRecordCreate } from '@/client'
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

  // Preserve existing public interface: no correctState/feedMaterialPackType params,
  // always hardcode feedMaterialPackType='new' and checkPackCodeMatch='true'
  override async uploadAppend(params: {
    statId: number
    slotIdno: string
    subSlotIdno?: string | null
    materialPackCode: string
    correctState?: 'true' | 'false' | 'warning' | null
    feedMaterialPackType?: string | null
    operatorId?: string | null
  }) {
    return super.uploadAppend({
      ...params,
      correctState: params.correctState ?? 'true',
      feedMaterialPackType: params.feedMaterialPackType ?? 'NEW_MATERIAL_PACK',
    })
  }
}
