import type { SmtMaterialInventory } from '@/client'

export type CorrectState = 'true' | 'false' | 'warning'

export type SmtMaterialInventoryEx = SmtMaterialInventory & { remark?: string }

export type InputComponentHandle = {
    focus: () => void
    clear?: () => void
}

export type MaterialMatchedPayload = {
    materialInventory: {
        idno: string
        remark?: string
    }
    matchedRows: Array<{
        slotIdno: string
        subSlotIdno?: string | null
    }>
}

export type ProductionRowModel = {
    correct: CorrectState | null
    id: number
    slotIdno: string
    subSlotIdno: string
    firstAppendTime?: string | null
    materialIdno: string
    materialInventoryIdno: string | null
    appendedMaterialInventoryIdno: string
    remark?: string
}
