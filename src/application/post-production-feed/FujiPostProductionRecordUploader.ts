import { buildPanasonicFeedRecordPayload } from '@/domain/production/PostProductionFeedRecord'
import type { UnfeedReasonEnum } from '@/client'
import { FujiPostProductionRecordApi } from '@/infra/post-production/FujiPostProductionRecordApi'

export class FujiPostProductionRecordUploader {
  constructor(private api: FujiPostProductionRecordApi) {}

  async uploadUnfeed(params: {
    statId: number
    slotIdno: string
    subSlotIdno?: string | null
    materialPackCode: string
    unfeedReason?: UnfeedReasonEnum | string | null
    operatorId?: string | null
  }) {
    const payload = buildPanasonicFeedRecordPayload({
      statId: params.statId,
      slotIdno: params.slotIdno,
      subSlotIdno: params.subSlotIdno ?? null,
      materialPackCode: params.materialPackCode,
      operationType: 'UNFEED',
      unfeedMaterialPackType: 'NORMAL_UNFEED',
      unfeedReason: params.unfeedReason ?? null,
      checkPackCodeMatch: 'true',
      feedMaterialPackType: null,
      operationTime: new Date().toISOString(),
      operatorId: params.operatorId ?? null,
    })
    return this.api.uploadFeedRecord(payload)
  }

  async uploadAppend(params: {
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
      feedMaterialPackType: 'new',
      checkPackCodeMatch: 'true',
      operationTime: new Date().toISOString(),
      operatorId: params.operatorId ?? null,
    })
    return this.api.uploadFeedRecord(payload)
  }

  async fetchMaterialInventory(materialInventoryIdno: string) {
    return this.api.fetchMaterialInventory(materialInventoryIdno)
  }
}
