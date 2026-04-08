import { buildPanasonicFeedRecordPayload } from '@/domain/production/PostProductionFeedRecord'
import {
  CheckMaterialMatchEnum,
  FeedMaterialTypeEnum,
  type PanasonicFeedRecordCreate,
  type UnfeedReasonEnum,
} from '@/client'

export type PostProductionCorrectState =
  | 'MATCHED_MATERIAL_PACK'
  | 'UNMATCHED_MATERIAL_PACK'
  | 'TESTING_MATERIAL_PACK'

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
      checkPackCodeMatch: CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK,
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
    feedMaterialPackType?: FeedMaterialTypeEnum | null
    operatorId?: string | null
  }) {
    const payload = buildPanasonicFeedRecordPayload({
      statId: params.statId,
      slotIdno: params.slotIdno,
      subSlotIdno: params.subSlotIdno ?? null,
      materialPackCode: params.materialPackCode,
      operationType: 'FEED',
      feedMaterialPackType: params.feedMaterialPackType ?? FeedMaterialTypeEnum.NEW_MATERIAL_PACK,
      checkPackCodeMatch: params.correctState !== undefined
        ? params.correctState as CheckMaterialMatchEnum
        : CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK,
      operationTime: new Date().toISOString(),
      operatorId: params.operatorId ?? '',
    })
    return this.doUpload(payload as unknown as PanasonicFeedRecordCreate)
  }

  async fetchMaterialInventory(materialInventoryIdno: string) {
    return this.doFetchMaterialInventory(materialInventoryIdno)
  }
}
