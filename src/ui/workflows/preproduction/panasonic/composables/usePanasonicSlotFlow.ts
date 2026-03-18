import { useSlotSubmitStore } from '@/stores/slotSubmitStore'
import { SlotUploadScheduler } from '@/application/slot-submit/SlotUploadScheduler'
import { useSlotUploadScheduler } from '@/ui/shared/composables/useSlotUploadScheduler'
import { SlotSubmissionRunner } from '@/application/slot-submit/SlotSubmissionRunner'
import { createSlotSubmitStrategy } from '@/application/slot-submit/createSlotSubmitStrategy'

export type PanasonicSlotFlowOptions<TResult = unknown, TRow = unknown> = {
  isTestingMode: boolean
  isMockMode?: boolean
  getResult?: () => TResult
  autoUpload?: (rows: TRow[]) => void
  onResetInputs?: () => void
}

export function usePanasonicSlotFlow<TResult = unknown, TRow = unknown>(
  options: PanasonicSlotFlowOptions<TResult, TRow>
) {
  const store = useSlotSubmitStore()
  store.setTestingMode(options.isTestingMode)

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

  const { handleSlotSubmit } = SlotSubmissionRunner({
    submit: async (payload) => {
      const storeDeps = store.getDeps?.() ?? (store.deps as any)?.value ?? store.deps ?? {}
      const deps = { ...storeDeps, store }
      const strategy = createSlotSubmitStrategy(options.isTestingMode, options.isMockMode, deps)
      return strategy.submit({ ...payload, result: options.getResult?.() as any })
    },
    afterSuccess: () => {
      if (!store.isTestingMode) scheduleCheck()
    }
  })

  return {
    store,
    handleSlotSubmit
  }
}
