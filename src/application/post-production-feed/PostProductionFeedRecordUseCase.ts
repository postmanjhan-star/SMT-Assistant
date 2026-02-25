import {
    type CheckMaterialMatchEnum,
    type FeedMaterialTypeEnum,
    type UnfeedMaterialTypeEnum,
    SmtService,
} from "@/client"
import {
    buildPanasonicFeedRecordPayload,
    type PostProductionFeedRecordInput,
} from "@/domain/production/PostProductionFeedRecord"

export type PostProductionCorrectState = "true" | "false" | "warning"

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
    feedMaterialPackType?: FeedMaterialTypeEnum | string | null
    operatorId?: string | null
}

export type UnfeedRecordInput = {
    statId: number
    slotIdno: string
    subSlotIdno?: string | null
    materialPackCode: string
    unfeedMaterialPackType?: UnfeedMaterialTypeEnum | string | null
    operatorId?: string | null
}

export async function uploadPostProductionFeedRecord(
    input: PostProductionFeedRecordUpload
) {
    const payload = buildPanasonicFeedRecordPayload({
        ...input,
        operationTime: new Date().toISOString(),
    })

    return SmtService.addPanasonicMounterItemStatRoll({ requestBody: payload })
}

export async function uploadInspectionRecord(input: InspectionRecordInput) {
    return uploadPostProductionFeedRecord({
        statId: input.statId,
        slotIdno: input.slotIdno,
        subSlotIdno: input.subSlotIdno ?? null,
        materialPackCode: input.materialPackCode,
        operationType: "FEED",
        feedMaterialPackType: "inspect",
        checkPackCodeMatch: "true",
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
        feedMaterialPackType: input.feedMaterialPackType ?? "new",
        checkPackCodeMatch: (input.correctState ?? null) as
            | CheckMaterialMatchEnum
            | string
            | null,
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
        checkPackCodeMatch: null,
        operatorId: input.operatorId ?? "",
    })
}

export async function fetchMaterialInventoryForSmt(
    materialInventoryIdno: string
) {
    return SmtService.getMaterialInventoryForSmt({ materialInventoryIdno })
}