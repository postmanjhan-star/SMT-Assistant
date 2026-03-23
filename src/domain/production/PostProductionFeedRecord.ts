/* eslint-disable no-restricted-imports -- [Phase-1 whitelist] tracked in REFACTORING_BASELINE.md, fix in Phase 2 (Domain 純化) */
import type {
    CheckMaterialMatchEnum,
    FeedMaterialTypeEnum,
    MaterialOperationTypeEnum,
    PanasonicFeedRecordCreate,
    UnfeedMaterialTypeEnum,
    UnfeedReasonEnum,
} from "@/client"

export type PostProductionFeedRecordInput = {
    statId: number
    slotIdno: string
    subSlotIdno?: string | null
    materialPackCode: string
    operationType?: MaterialOperationTypeEnum | string | null
    feedMaterialPackType?: FeedMaterialTypeEnum | string | null
    unfeedMaterialPackType?: UnfeedMaterialTypeEnum | string | null
    unfeedReason?: UnfeedReasonEnum | string | null
    checkPackCodeMatch?: CheckMaterialMatchEnum | string | null
    operationTime: string
    operatorId?: string | null
}

export type ParsedSlotId = {
    slotIdno: string
    subSlotIdno: string
}

export const parseSlotIdno = (slotIdno: string): ParsedSlotId => {
    const [slot, subSlot = ""] = slotIdno.split("-")
    return {
        slotIdno: slot.trim(),
        subSlotIdno: subSlot.trim(),
    }
}

export const toFeedMaterialType = (
    value: FeedMaterialTypeEnum | string | null | undefined
): FeedMaterialTypeEnum | null => {
    if (value == null) return null
    return value as unknown as FeedMaterialTypeEnum
}

export const toOperationType = (
    value: MaterialOperationTypeEnum | string | null | undefined
): MaterialOperationTypeEnum => {
    if (value == null) return "FEED" as unknown as MaterialOperationTypeEnum
    return value as unknown as MaterialOperationTypeEnum
}

export const toUnfeedMaterialType = (
    value: UnfeedMaterialTypeEnum | string | null | undefined
): UnfeedMaterialTypeEnum | null => {
    if (value == null) return null
    return value as unknown as UnfeedMaterialTypeEnum
}

export const toCheckMaterialMatch = (
    value: CheckMaterialMatchEnum | string | null | undefined
): CheckMaterialMatchEnum | null => {
    if (value == null) return null
    return value as unknown as CheckMaterialMatchEnum
}

export const buildPanasonicFeedRecordPayload = (
    input: PostProductionFeedRecordInput
): PanasonicFeedRecordCreate => {
    const operationType = toOperationType(input.operationType)

    return {
        stat_item_id: input.statId,
        operator_id: input.operatorId ?? "",
        operation_time: input.operationTime,
        slot_idno: input.slotIdno,
        sub_slot_idno: input.subSlotIdno ?? null,
        material_pack_code: input.materialPackCode,
        operation_type: operationType,
        feed_material_pack_type: toFeedMaterialType(input.feedMaterialPackType),
        unfeed_material_pack_type: toUnfeedMaterialType(
            input.unfeedMaterialPackType
        ),
        unfeed_reason: (input.unfeedReason ?? null) as
            | UnfeedReasonEnum
            | null,
        check_pack_code_match: toCheckMaterialMatch(input.checkPackCodeMatch),
    }
}
