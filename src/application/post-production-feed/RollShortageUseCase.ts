import type { RollShortageInput, RollShortageValidation } from '@/domain/production/RollShortageRules'

export type RollShortageUseCaseDeps = {
  validate: (input: RollShortageInput) => RollShortageValidation
  fetchInventory: (materialInventoryIdno: string) => Promise<unknown>
  uploadAppend: (input: {
    statId: number
    slotIdno: string
    subSlotIdno?: string | null
    materialPackCode: string
    correctState?: string | null
    feedMaterialPackType?: string | null
    operatorId?: string | null
  }) => Promise<unknown>
}

export type RollShortageResult =
  | { ok: true }
  | { ok: false; error: RollShortageValidation['error'] | 'upload_failed' | 'inventory_fetch_failed' }

// App: validates inputs, loads inventory, uploads append record
export class RollShortageUseCase {
  constructor(private deps: RollShortageUseCaseDeps) {}

  async execute(input: RollShortageInput): Promise<RollShortageResult> {
    const validation = this.deps.validate(input)
    if (!validation.ok) return { ok: false, error: validation.error }

    try {
      await this.deps.fetchInventory(input.materialInventoryIdno)
    } catch {
      return { ok: false, error: 'inventory_fetch_failed' }
    }

    try {
      await this.deps.uploadAppend({
        statId: 0,
        slotIdno: '',
        subSlotIdno: null,
        materialPackCode: input.materialInventoryIdno,
        feedMaterialPackType: input.type,
      })
    } catch {
      return { ok: false, error: 'upload_failed' }
    }

    return { ok: true }
  }
}
