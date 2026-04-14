import { CheckMaterialMatchEnum, FeedMaterialTypeEnum, type PanasonicFeedRecordCreate } from '@/client'
import { PostProductionFeedUploader } from './PostProductionFeedUploader'
import { buildPanasonicFeedRecordPayload } from '@/domain/production/PostProductionFeedRecord'
import type { RecordApiPort } from './RecordApiPort'

export type { PostProductionCorrectState } from './PostProductionFeedUploader'

export class PostProductionRecordUploader extends PostProductionFeedUploader {
  constructor(private api: RecordApiPort) {
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
    checkPackCodeMatch?: CheckMaterialMatchEnum | null
  }) {
    const payload = buildPanasonicFeedRecordPayload({
      statId: params.statId,
      slotIdno: params.slotIdno,
      subSlotIdno: params.subSlotIdno ?? null,
      materialPackCode: params.materialPackCode,
      operationType: 'FEED',
      feedMaterialPackType: FeedMaterialTypeEnum.INSPECTION_MATERIAL_PACK,
      checkPackCodeMatch: params.checkPackCodeMatch ?? CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK,
      operationTime: new Date().toISOString(),
      operatorId: params.operatorId ?? '',
    })
    return this.doUpload(payload as unknown as PanasonicFeedRecordCreate)
  }
}
