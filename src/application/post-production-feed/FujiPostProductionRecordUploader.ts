import type { PanasonicFeedRecordCreate } from '@/client'
import { FujiPostProductionRecordApi } from '@/infra/post-production/FujiPostProductionRecordApi'
import { PostProductionFeedUploader } from './PostProductionFeedUploader'

export class FujiPostProductionRecordUploader extends PostProductionFeedUploader {
  constructor(private api: FujiPostProductionRecordApi) {
    super()
  }

  protected doUpload(payload: PanasonicFeedRecordCreate) {
    return this.api.uploadFeedRecord(payload)
  }

  protected doFetchMaterialInventory(id: string) {
    return this.api.fetchMaterialInventory(id)
  }

  // Preserve existing public interface: no correctState/feedMaterialPackType params,
  // always hardcode feedMaterialPackType='new' and checkPackCodeMatch='true'
  override async uploadAppend(params: {
    statId: number
    slotIdno: string
    subSlotIdno?: string | null
    materialPackCode: string
    operatorId?: string | null
  }) {
    return super.uploadAppend({
      ...params,
      correctState: 'true',
      feedMaterialPackType: 'new',
    })
  }
}
