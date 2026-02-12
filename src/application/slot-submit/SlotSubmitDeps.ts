export type SlotSubmitLastResult = {
  type: 'success' | 'warn' | 'error'
  message: string
}

export type SlotSubmitBindingPort = {
  applyMatch: (
    slotIdno: string,
    material?: { idno?: string; remark?: string } | null,
    input?: { slot?: string; subSlot?: string | null }
  ) => boolean
  applyWarningBinding: (
    slotIdno: string,
    material?: { idno?: string } | null,
    remark?: string
  ) => boolean
  applyMismatch: (
    input: { slot: string; subSlot: string | null },
    expectedSlotIdno: string,
    materialIdno?: string
  ) => void
}

export type SlotSubmitGridPort = {
  hasRow: (rowId: string) => boolean
  cleanErrorMaterialInventory: (
    materialIdno: string,
    slot: string,
    subSlot: string | null
  ) => void
  applyBindingSuccess: (
    slotIdno: string,
    materialIdno: string,
    remark: string
  ) => boolean | void
  applyWarningBinding: (
    slotIdno: string,
    materialIdno: string,
    remark: string
  ) => boolean
  markMismatch: (
    slot: string,
    subSlot: string | null,
    materialIdno: string
  ) => void
  deselectRow: (slotIdno: string) => boolean
  checkAllCorrect: () => { allCorrect: boolean; invalidSlots: string[] }
  getAllRowsData: () => any[]
}

export type SlotSubmitStoreLike = {
  setLastResult: (result: SlotSubmitLastResult | null) => void
  clearLastResult?: () => void
  resetInputs?: () => void
  hasRow?: (rowId: string) => boolean
  applyMatch?: SlotSubmitBindingPort['applyMatch']
  applyWarningBinding?: SlotSubmitBindingPort['applyWarningBinding']
  applyMismatch?: SlotSubmitBindingPort['applyMismatch']
}

export type SlotSubmitDeps = {
  store: SlotSubmitStoreLike
  binding?: SlotSubmitBindingPort
  grid?: SlotSubmitGridPort
  resetInputs?: () => void
}
