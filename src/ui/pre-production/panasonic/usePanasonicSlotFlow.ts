import { useSlotSubmitStore } from '@/stores/slotSubmitStore'
import { SlotUploadScheduler } from '@/application/slot-submit/SlotUploadScheduler'
import { useSlotUploadScheduler } from '@/ui/shared/composables/useSlotUploadScheduler'
import { PanasonicSlotSubmitFlow } from '@/application/slot-submit/PanasonicSlotSubmitFlow'

export type PanasonicSlotFlowOptions = {
  isTestingMode: boolean
  getResult?: () => any
  autoUpload?: (rows: any[]) => void
}

export function usePanasonicSlotFlow(options: PanasonicSlotFlowOptions) {
  const store = useSlotSubmitStore()

  const scheduler = new SlotUploadScheduler({
    checkShouldUpload: () => {
      const { shouldAutoUpload } = store.checkAutoUpload()
      return { shouldUpload: shouldAutoUpload, rows: store.pendingAutoUpload }
    },
    onUpload: (rows) => {
      options.autoUpload?.(rows)
      store.clearPendingAutoUpload()
    }
  })

  const { scheduleCheck } = useSlotUploadScheduler(scheduler)

  const flow = new PanasonicSlotSubmitFlow({
    store,
    isTestingMode: options.isTestingMode,
    getResult: options.getResult,
    onAfterSuccess: () => {
      if (!store.isTestingMode) scheduleCheck()
    }
  })

  const handleSlotSubmit = (payload: { slotIdno: string; slot: string; subSlot: string }) =>
    flow.execute(payload)

  return {
    store,
    handleSlotSubmit
  }
}
