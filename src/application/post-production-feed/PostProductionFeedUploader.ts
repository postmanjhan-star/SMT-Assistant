import { buildPanasonicFeedRecordPayload } from '@/domain/production/PostProductionFeedRecord'
import type {
  CheckMaterialMatchEnum,
  FeedMaterialTypeEnum,
  PanasonicFeedRecordCreate,
  UnfeedReasonEnum,
} from '@/client'

export type PostProductionCorrectState = 'true' | 'false' | 'warning'

export abstract class PostProductionFeedUploader {
  protected abstract doUpload(payload: PanasonicFeedRecordCreate): Promise<any>
  protected abstract doFetchMaterialInventory(id: string): Promise<any>

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
      operatorId: params.operatorId ?? '',
    })
    return this.doUpload(payload as unknown as PanasonicFeedRecordCreate)
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
      operationType: 'FEED',
      feedMaterialPackType: params.feedMaterialPackType ?? 'new',
      checkPackCodeMatch: (params.correctState ?? null) as CheckMaterialMatchEnum | string | null,
      operationTime: new Date().toISOString(),
      operatorId: params.operatorId ?? '',
    })
    return this.doUpload(payload as unknown as PanasonicFeedRecordCreate)
  }

  async fetchMaterialInventory(materialInventoryIdno: string) {
    return this.doFetchMaterialInventory(materialInventoryIdno)
  }
}
