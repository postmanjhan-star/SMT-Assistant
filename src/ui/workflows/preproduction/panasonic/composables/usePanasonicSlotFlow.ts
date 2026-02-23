import { useSlotSubmitStore } from '@/stores/slotSubmitStore'
import { SlotUploadScheduler } from '@/application/slot-submit/SlotUploadScheduler'
import { useSlotUploadScheduler } from '@/ui/shared/composables/useSlotUploadScheduler'
import { PanasonicSlotSubmitFlow } from '@/application/slot-submit/PanasonicSlotSubmitFlow'

export type PanasonicSlotFlowOptions<TResult = unknown, TRow = unknown> = {
  isTestingMode: boolean
  getResult?: () => TResult
  autoUpload?: (rows: TRow[]) => void
  onResetInputs?: () => void
}

export function usePanasonicSlotFlow<TResult = unknown, TRow = unknown>(
  options: PanasonicSlotFlowOptions<TResult, TRow>
) {
  const store = useSlotSubmitStore()

  const scheduler = new SlotUploadScheduler({
    checkShouldUpload: () => {
      const { shouldAutoUpload } = store.checkAutoUpload()
      return { shouldUpload: shouldAutoUpload, rows: store.pendingAutoUpload }
    },
    onUpload: (rows) => {
      options.autoUpload?.(rows as TRow[])
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

  const handleSlotSubmit = async (payload: {
    slotIdno: string
    slot: string
    subSlot: string
  }) => {
    let success = false
    try {
      success = await flow.execute(payload)
      return success
    } finally {
      options.onResetInputs?.()
    }
  }

  return {
    store,
    handleSlotSubmit
  }
}
