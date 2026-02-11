import type { SmtMaterialInventory } from '@/client'

export type CorrectState = 'true' | 'false' | 'warning'

export type SmtMaterialInventoryEx = SmtMaterialInventory & { remark?: string }

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
