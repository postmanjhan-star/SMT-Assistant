import { NormalModeStrategy } from '@/application/slot-submit/NormalModeStrategy'
import { TestingModeStrategy } from '@/application/slot-submit/TestingModeStrategy'
import type { SlotSubmitStrategy } from '@/application/slot-submit/SlotSubmitStrategy'
import type { SlotSubmitPayload } from '@/application/slot-submit/SlotSubmissionRunner'
import type { SlotSubmitStore } from '@/stores/slotSubmitStore'

export type PanasonicSlotSubmitFlowDeps = {
  store: SlotSubmitStore
  isTestingMode: boolean
  getResult?: () => any
  onAfterSuccess?: () => void | Promise<void>
}

// App: Panasonic-specific orchestration using slot-submit strategies
export class PanasonicSlotSubmitFlow {
  private deps: PanasonicSlotSubmitFlowDeps

  constructor(deps: PanasonicSlotSubmitFlowDeps) {
    this.deps = deps
    this.deps.store.setTestingMode(this.deps.isTestingMode)
  }

  private getStrategy(): SlotSubmitStrategy {
    const storeDeps =
      this.deps.store.getDeps?.() ??
      (this.deps.store.deps as any)?.value ??
      this.deps.store.deps ??
      {}
    const deps = { ...storeDeps, store: this.deps.store }
    return this.deps.isTestingMode
      ? new TestingModeStrategy(deps)
      : new NormalModeStrategy(deps)
  }

  async execute(payload: SlotSubmitPayload): Promise<boolean> {
    const success = await this.getStrategy().submit({
      ...payload,
      result: this.deps.getResult?.(),
    })

    if (!success) return false

    if (this.deps.onAfterSuccess) {
      await this.deps.onAfterSuccess()
    }

    return true
  }
}
