import type { PanasonicFeedRecordCreate } from '@/client'
import { PostProductionRecordApi } from '@/infra/post-production/PostProductionRecordApi'
import { PostProductionFeedUploader } from './PostProductionFeedUploader'
import { buildPanasonicFeedRecordPayload } from '@/domain/production/PostProductionFeedRecord'

export type { PostProductionCorrectState } from './PostProductionFeedUploader'

export class PostProductionRecordUploader extends PostProductionFeedUploader {
  constructor(private api: PostProductionRecordApi) {
    super()
  }

  protected doUpload(payload: PanasonicFeedRecordCreate) {
    return this.api.uploadFeedRecord(payload)
  }

  protected doFetchMaterialInventory(id: string) {
    return this.api.fetchMaterialInventory(id)
  }

  // Panasonic-only: inspection upload
  async uploadInspection(params: {
    statId: number
    slotIdno: string
    subSlotIdno?: string | null
    materialPackCode: string
    operatorId?: string | null
  }) {
    const payload = buildPanasonicFeedRecordPayload({
      statId: params.statId,
      slotIdno: params.slotIdno,
      subSlotIdno: params.subSlotIdno ?? null,
      materialPackCode: params.materialPackCode,
      operationType: 'FEED',
      feedMaterialPackType: 'inspect',
      checkPackCodeMatch: 'true',
      operationTime: new Date().toISOString(),
      operatorId: params.operatorId ?? '',
    })
    return this.doUpload(payload)
  }
}
