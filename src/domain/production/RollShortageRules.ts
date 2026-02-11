export type RollShortageInput = {
  materialInventoryIdno: string
  slotIdno: string
  type: string
}

export type RollShortageValidation =
  | { ok: true }
  | { ok: false; error: 'materialInventoryIdno_required' | 'slotIdno_required' | 'type_required' }

// Domain: validation + decisions only
export function validateRollShortageInput(input: RollShortageInput): RollShortageValidation {
  if (!input.materialInventoryIdno?.trim()) {
    return { ok: false, error: 'materialInventoryIdno_required' }
  }

  if (!input.slotIdno?.trim()) {
    return { ok: false, error: 'slotIdno_required' }
  }

  if (!input.type?.trim()) {
    return { ok: false, error: 'type_required' }
  }

  return { ok: true }
}
