export type SlotInputPolicyDeps = {
    clearMaterialResult: () => void
    notifySlotSubmitted: () => void
    focusMaterialInput: () => void
}

export class SlotInputPolicy {
    static afterSuccessfulBinding(deps: SlotInputPolicyDeps) {
        deps.clearMaterialResult()
        deps.notifySlotSubmitted()
        deps.focusMaterialInput()
    }

    static afterSlotSubmit(deps: SlotInputPolicyDeps) {
        SlotInputPolicy.afterSuccessfulBinding(deps)
    }
}
