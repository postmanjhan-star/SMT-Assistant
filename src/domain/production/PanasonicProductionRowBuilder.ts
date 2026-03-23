// eslint-disable-next-line no-restricted-imports -- [Phase-1 whitelist] tracked in REFACTORING_BASELINE.md, fix in Phase 2 (Domain 純化)
import type { PanasonicMounterFileItemRead } from '@/client'
import type { BaseProductionRow } from '@/domain/production/BaseProductionRow'

export type PanasonicProductionRow = BaseProductionRow & {
  correct: null
  slotIdno: string
  subSlotIdno: string | null
  firstAppendTime: string | null
  appendedMaterialInventoryIdno: string
}

export class PanasonicProductionRowBuilder {
  static build(items: PanasonicMounterFileItemRead[]): PanasonicProductionRow[] {
    return items.map((i, index) => ({
      correct: null,
      id: i.id ?? -(index + 1),
      slotIdno: i.slot_idno ?? '',
      subSlotIdno: i.sub_slot_idno ?? null,
      firstAppendTime: null,
      materialIdno: i.smd_model_idno,
      operatorIdno: null,
      appendedMaterialInventoryIdno: '',
      materialInventoryIdno: null,
    }))
  }
}
