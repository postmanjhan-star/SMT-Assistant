// eslint-disable-next-line no-restricted-imports -- [Phase-1 whitelist] tracked in REFACTORING_BASELINE.md, fix in Phase 3
import type { SmtMaterialInventory } from "@/client"
import type { SlotCandidate } from "@/domain/slot/SlotBindingRules"

export type CorrectState = "true" | "false" | "warning" | "unloaded"

export type SmtMaterialInventoryEx = SmtMaterialInventory & { remark?: string }

export type InputComponentHandle = {
  focus: () => void
  clear?: () => void
}

export type MaterialMatchedRow = SlotCandidate

export type MaterialMatchedPayload = {
  materialInventory: {
    idno: string
    remark?: string
  }
  matchedRows: MaterialMatchedRow[]
}

export type SlotInputResult = {
  success: boolean
  materialInventory?: MaterialMatchedPayload["materialInventory"] | null
  matchedRows?: MaterialMatchedPayload["matchedRows"]
}

export type ProductionRowModel = {
  correct: CorrectState | null
  id: number
  slotIdno: string
  subSlotIdno: string | null
  firstAppendTime?: string | null
  materialIdno: string
  operatorIdno?: string | null
  materialInventoryIdno: string | null
  appendedMaterialInventoryIdno: string
  inspectMaterialPackCode?: string
  inspectTime?: string | null
  inspectCount?: number
  remark?: string
}
