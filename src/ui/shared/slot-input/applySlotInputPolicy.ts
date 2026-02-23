import { SlotInputPolicy } from "@/domain/slot/policies/SlotInputPolicy"

export type ApplySlotInputPolicyDeps = {
  clearMaterialResult: () => void
  bumpResetKeys: () => void
  clearMaterialInput: () => void
  clearSlotInput: () => void
  focusMaterialInput: () => void
}

export function applySlotInputPolicy(deps: ApplySlotInputPolicyDeps) {
  SlotInputPolicy.afterSlotSubmit({
    clearMaterialResult: deps.clearMaterialResult,
    notifySlotSubmitted: () => {
      deps.clearMaterialInput()
      deps.clearSlotInput()
      deps.bumpResetKeys()
    },
    focusMaterialInput: () => {
      requestAnimationFrame(() => {
        deps.focusMaterialInput()
      })
    },
  })
}
