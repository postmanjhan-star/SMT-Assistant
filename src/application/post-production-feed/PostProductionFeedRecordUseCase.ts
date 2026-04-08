import {
    CheckMaterialMatchEnum,
    FeedMaterialTypeEnum,
    type PanasonicFeedRecordCreate,
    type UnfeedMaterialTypeEnum,
    type UnfeedReasonEnum,
    SmtService,
} from "@/client"
import {
    buildPanasonicFeedRecordPayload,
    type PostProductionFeedRecordInput,
} from "@/domain/production/PostProductionFeedRecord"

export type PostProductionCorrectState =
    | "MATCHED_MATERIAL_PACK"
    | "UNMATCHED_MATERIAL_PACK"
    | "TESTING_MATERIAL_PACK"

export type PostProductionFeedRecordUpload = Omit<
    PostProductionFeedRecordInput,
    "operationTime"
>

export type InspectionRecordInput = {
    statId: number
    slotIdno: string
    subSlotIdno?: string | null
    materialPackCode: string
    operatorId?: string | null
}

export type AppendRecordInput = {
    statId: number
    slotIdno: string
    subSlotIdno?: string | null
    materialPackCode: string
    correctState?: PostProductionCorrectState | null
    feedMaterialPackType?: FeedMaterialTypeEnum | null
    operatorId?: string | null
}

export type UnfeedRecordInput = {
    statId: number
    slotIdno: string
    subSlotIdno?: string | null
    materialPackCode: string
    unfeedMaterialPackType?: UnfeedMaterialTypeEnum | string | null
    unfeedReason?: UnfeedReasonEnum | string | null
    operatorId?: string | null
}

export async function uploadPostProductionFeedRecord(
    input: PostProductionFeedRecordUpload
) {
    const payload = buildPanasonicFeedRecordPayload({
        ...input,
        operationTime: new Date().toISOString(),
    })

    return SmtService.addPanasonicMounterItemStatRoll({ requestBody: payload as unknown as PanasonicFeedRecordCreate })
}

export async function uploadInspectionRecord(input: InspectionRecordInput) {
    return uploadPostProductionFeedRecord({
        statId: input.statId,
        slotIdno: input.slotIdno,
        subSlotIdno: input.subSlotIdno ?? null,
        materialPackCode: input.materialPackCode,
        operationType: "FEED",
        feedMaterialPackType: FeedMaterialTypeEnum.INSPECTION_MATERIAL_PACK,
        checkPackCodeMatch: CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK,
        operatorId: input.operatorId ?? "",
    })
}

export async function uploadAppendRecord(input: AppendRecordInput) {
    return uploadPostProductionFeedRecord({
        statId: input.statId,
        slotIdno: input.slotIdno,
        subSlotIdno: input.subSlotIdno ?? null,
        materialPackCode: input.materialPackCode,
        operationType: "FEED",
        feedMaterialPackType: input.feedMaterialPackType ?? FeedMaterialTypeEnum.NEW_MATERIAL_PACK,
        checkPackCodeMatch: (input.correctState ?? null) as CheckMaterialMatchEnum | null,
        operatorId: input.operatorId ?? "",
    })
}

export async function uploadUnfeedRecord(input: UnfeedRecordInput) {
    return uploadPostProductionFeedRecord({
        statId: input.statId,
        slotIdno: input.slotIdno,
        subSlotIdno: input.subSlotIdno ?? null,
        materialPackCode: input.materialPackCode,
        operationType: "UNFEED",
        feedMaterialPackType: null,
        unfeedMaterialPackType: input.unfeedMaterialPackType ?? "NORMAL_UNFEED",
        unfeedReason: input.unfeedReason ?? null,
        checkPackCodeMatch: CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK,
        operatorId: input.operatorId ?? "",
    })
}

export async function fetchMaterialInventoryForSmt(
    materialInventoryIdno: string
) {
    return SmtService.getMaterialInventoryForSmt({ materialInventoryIdno })
}
