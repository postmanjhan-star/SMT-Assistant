import type { SlotSubmitStore } from '@/stores/slotSubmitStore'
import { ApplySlotBindingUseCase } from '@/application/slot-submit/ApplySlotBindingUseCase'
import { CheckAutoUploadUseCase } from '@/application/slot-submit/CheckAutoUploadUseCase'

type Notifier = {
  success: (msg: string) => void
  warn: (msg: string) => void
  error: (msg: string) => void
}

export function useSlotSubmitController(opts: {
  store: SlotSubmitStore
  grid: any
  resetInputs: () => void
  notifier: Notifier
}) {
  const binding = new ApplySlotBindingUseCase({ grid: opts.grid })
  const checkAuto = new CheckAutoUploadUseCase()

  function applyMatch(args: { slotIdno: string; material?: { idno?: string; remark?: string }; input?: { slot?: string; subSlot?: string | null } }) {
    return binding.applyMatch(args.slotIdno, args.material, args.input)
  }

  function applyWarningBinding(args: { slotIdno: string; material?: { idno?: string }; remark?: string }) {
    return binding.applyWarningBinding(args.slotIdno, args.material, args.remark)
  }

  function applyMismatch(args: { input: { slot: string; subSlot: string | null }; expectedSlotIdno: string; materialIdno?: string }) {
    return binding.applyMismatch(args.input, args.expectedSlotIdno, args.materialIdno)
  }

  function checkAutoUpload() {
    const result = checkAuto.execute({
      grid: opts.grid,
      isTestingMode: opts.store.isTestingMode,
      mode: opts.store.mode,
    })

    opts.store.setPendingAutoUpload(result.pendingRows)
    if (result.shouldAutoUpload && result.message) {
      opts.store.setLastResult({ type: 'success', message: result.message })
      opts.notifier.success(result.message)
    }
    return result
  }

  return {
    applyMatch,
    applyWarningBinding,
    applyMismatch,
    checkAutoUpload,
    resetInputs: opts.resetInputs,
  }
}
