import type { SlotSubmitGridPort } from './SlotSubmitDeps'

export type SlotBindingDeps = {
  grid: SlotSubmitGridPort
}

export class ApplySlotBindingUseCase {
  constructor(private deps: SlotBindingDeps) {}

  applyMatch(
    slotIdno: string,
    material?: { idno?: string; remark?: string },
    input?: { slot?: string; subSlot?: string | null }
  ): boolean {
    const { grid } = this.deps
    if (!grid.hasRow(slotIdno)) return false

    if (input?.slot) {
      grid.cleanErrorMaterialInventory(material?.idno ?? '', input.slot, input.subSlot ?? null)
    }

    grid.applyBindingSuccess(slotIdno, material?.idno ?? '', material?.remark ?? '')
    return true
  }

  applyWarningBinding(slotIdno: string, material?: { idno?: string }, remark?: string): boolean {
    const { grid } = this.deps
    return grid.applyWarningBinding(slotIdno, material?.idno ?? '', remark ?? '')
  }

  applyMismatch(input: { slot: string; subSlot: string | null }, expectedSlotIdno: string, materialIdno?: string) {
    const { grid } = this.deps
    grid.markMismatch(input.slot, input.subSlot, materialIdno ?? '')
    grid.deselectRow(expectedSlotIdno)
  }
}
