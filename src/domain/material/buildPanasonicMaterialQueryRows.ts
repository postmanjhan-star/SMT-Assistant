import type {
    CheckMaterialMatchEnum,
    FeedMaterialTypeEnum,
    PanasonicItemStatFeedLogRead,
} from "@/client"

export type PanasonicMaterialQueryRowModel = {
    id: number
    correct: CheckMaterialMatchEnum | null
    slotIdno: string
    subSlotIdno: string
    materialInventoryIdno: string
    materialInventoryType: FeedMaterialTypeEnum | null
    checktime: string
    operatorName: string
    remark?: string
}

export const buildPanasonicMaterialQueryRows = (
    logs: PanasonicItemStatFeedLogRead[]
): PanasonicMaterialQueryRowModel[] => {
    return logs.map(log => ({
        id: log.id,
        correct: log.check_pack_code_match,
        slotIdno: log.slot_idno,
        subSlotIdno: log.sub_slot_idno,
        materialInventoryIdno: log.material_pack_code,
        materialInventoryType: log.feed_material_pack_type,
        operatorName: log.operator_id ?? "",
        checktime: log.created_at,
        remark:
            log.check_pack_code_match === "TESTING_MATERIAL_PACK"
                ? "[虛擬測試物料]"
                : "",
    }))
}
