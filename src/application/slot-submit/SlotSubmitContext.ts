import { SmtMaterialInventory } from '@/client'

type SmtMaterialInventoryEx = SmtMaterialInventory & { remark?: string }

type ResultType = {
    success: boolean,
    materialInventory?: SmtMaterialInventoryEx | null,
    matchedRows?: any[]
}

export type SlotSubmitContext = {
    result: ResultType | null,
    slot: string,
    subSlot: string | null,
    slotIdno: string
}