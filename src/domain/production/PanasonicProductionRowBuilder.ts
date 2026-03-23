import type { PanasonicMounterFileItemInput } from '@/domain/shared/inputTypes'
import type { BaseProductionRow } from '@/domain/production/BaseProductionRow'

export type PanasonicProductionRow = BaseProductionRow & {
  correct: null
  slotIdno: string
  subSlotIdno: string | null
  firstAppendTime: string | null
  appendedMaterialInventoryIdno: string
}

export class PanasonicProductionRowBuilder {
  static build(items: PanasonicMounterFileItemInput[]): PanasonicProductionRow[] {
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
