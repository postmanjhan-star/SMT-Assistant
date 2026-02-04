import { SmtMaterialInventory } from '@/client'
import { SlotCandidate } from '@/domain/slot/SlotBindingRules'

type SmtMaterialInventoryEx = SmtMaterialInventory & { remark?: string }

type ResultType = {
    success: boolean,
    materialInventory?: SmtMaterialInventoryEx | null,
    matchedRows?: SlotCandidate[]
}

export type SlotSubmitContext = {
    result: ResultType | null,
    slot: string,
    subSlot: string | null,
    slotIdno: string
}
