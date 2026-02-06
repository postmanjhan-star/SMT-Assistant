import type {
    CheckMaterialMatchEnum,
    FeedMaterialTypeEnum,
    PanasonicFeedRecordCreate,
} from "@/client"

export type PostProductionFeedRecordInput = {
    statId: number
    slotIdno: string
    subSlotIdno?: string | null
    materialPackCode: string
    feedMaterialPackType: FeedMaterialTypeEnum | string | null
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
    value: FeedMaterialTypeEnum | string | null
): FeedMaterialTypeEnum | null => {
    return value as unknown as FeedMaterialTypeEnum
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
    return {
        stat_item_id: input.statId,
        operator_id: input.operatorId ?? "",
        operation_time: input.operationTime,
        slot_idno: input.slotIdno,
        sub_slot_idno: input.subSlotIdno ?? null,
        material_pack_code: input.materialPackCode,
        feed_material_pack_type: toFeedMaterialType(input.feedMaterialPackType),
        check_pack_code_match: toCheckMaterialMatch(input.checkPackCodeMatch),
    }
}
