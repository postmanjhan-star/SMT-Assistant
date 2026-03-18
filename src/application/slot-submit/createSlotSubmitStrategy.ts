import { NormalModeStrategy } from '@/application/slot-submit/NormalModeStrategy'
import { TestingModeStrategy } from '@/application/slot-submit/TestingModeStrategy'
import { MockNormalModeStrategy } from '@/application/slot-submit/MockNormalModeStrategy'
import type { SlotSubmitStrategy } from '@/application/slot-submit/SlotSubmitStrategy'
import type { SlotSubmitDeps } from '@/application/slot-submit/SlotSubmitDeps'

export function createSlotSubmitStrategy(
  isTestingMode: boolean,
  isMockMode: boolean | undefined,
  deps: SlotSubmitDeps,
): SlotSubmitStrategy {
  if (isMockMode && !isTestingMode) {
    return new MockNormalModeStrategy(deps)
  }
  return isTestingMode
    ? new TestingModeStrategy(deps)
    : new NormalModeStrategy(deps)
}
