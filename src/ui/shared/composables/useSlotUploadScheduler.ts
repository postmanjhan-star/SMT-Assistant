import { onBeforeUnmount } from 'vue'
import { SlotUploadScheduler } from '@/application/slot-submit/SlotUploadScheduler'

// UI-only: lifecycle/timer wiring
export function useSlotUploadScheduler(scheduler: SlotUploadScheduler) {
  onBeforeUnmount(() => {
    scheduler.cancel()
  })

  return {
    scheduleCheck: () => scheduler.schedule(),
    cancel: () => scheduler.cancel(),
  }
}
