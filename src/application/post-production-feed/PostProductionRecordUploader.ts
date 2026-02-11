import { buildPanasonicFeedRecordPayload } from '@/domain/production/PostProductionFeedRecord'
import type { FeedMaterialTypeEnum, CheckMaterialMatchEnum } from '@/client'
import { PostProductionRecordApi } from '@/infra/post-production/PostProductionRecordApi'

export type PostProductionCorrectState = 'true' | 'false' | 'warning'

export class PostProductionRecordUploader {
  constructor(private api: PostProductionRecordApi) {}

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
      feedMaterialPackType: 'inspect',
      checkPackCodeMatch: 'true',
      operationTime: new Date().toISOString(),
      operatorId: params.operatorId ?? '',
    })

    return this.api.uploadFeedRecord(payload)
  }

  async uploadAppend(params: {
    statId: number
    slotIdno: string
    subSlotIdno?: string | null
    materialPackCode: string
    correctState?: PostProductionCorrectState | null
    feedMaterialPackType?: FeedMaterialTypeEnum | string | null
    operatorId?: string | null
  }) {
    const payload = buildPanasonicFeedRecordPayload({
      statId: params.statId,
      slotIdno: params.slotIdno,
      subSlotIdno: params.subSlotIdno ?? null,
      materialPackCode: params.materialPackCode,
      feedMaterialPackType: params.feedMaterialPackType ?? 'new',
      checkPackCodeMatch: (params.correctState ?? null) as CheckMaterialMatchEnum | string | null,
      operationTime: new Date().toISOString(),
      operatorId: params.operatorId ?? '',
    })

    return this.api.uploadFeedRecord(payload)
  }

  async fetchMaterialInventory(materialInventoryIdno: string) {
    return this.api.fetchMaterialInventory(materialInventoryIdno)
  }
}
