import { SlotCandidate } from "@/domain/slot/SlotBindingRules"

export type MaterialInventoryLike = {
    idno: string
    remark?: string
}

export type MaterialScanResult = {
    success: boolean
    materialInventory?: MaterialInventoryLike | null
    matchedRows?: SlotCandidate[]
}

export type PostProductionFeedContext = {
    slot: string
    subSlot: string
    slotIdno: string
    result: MaterialScanResult | null
}
