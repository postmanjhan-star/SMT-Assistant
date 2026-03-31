export type FeedRecordPayload = {
    stat_item_id: number
    operator_id: string | null
    operation_time: string
    slot_idno: string
    sub_slot_idno: string | null
    material_pack_code: string | null
    operation_type?: string
    feed_material_pack_type?: string | null
    unfeed_material_pack_type?: string | null
    unfeed_reason?: string | null
    check_pack_code_match: string | null
}

export type PostProductionFeedRecordInput = {
    statId: number
    slotIdno: string
    subSlotIdno?: string | null
    materialPackCode: string
    operationType?: string | null
    feedMaterialPackType?: string | null
    unfeedMaterialPackType?: string | null
    unfeedReason?: string | null
    checkPackCodeMatch?: string | null
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
    value: string | null | undefined
): string | null => value ?? null

export const toOperationType = (
    value: string | null | undefined
): string => value ?? 'FEED'

export const toUnfeedMaterialType = (
    value: string | null | undefined
): string | null => value ?? null

export const toCheckMaterialMatch = (
    value: string | null | undefined
): string | null => value ?? null

export const buildPanasonicFeedRecordPayload = (
    input: PostProductionFeedRecordInput
): FeedRecordPayload => {
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
        unfeed_material_pack_type: toUnfeedMaterialType(input.unfeedMaterialPackType),
        unfeed_reason: (input.unfeedReason ?? null),
        check_pack_code_match: toCheckMaterialMatch(input.checkPackCodeMatch),
    }
}
