export type SlotSubmitPayload = {
  slotIdno: string
  slot: string
  subSlot: string
}

export type SlotSubmissionRunnerOptions = {
  submit: (payload: SlotSubmitPayload) => Promise<boolean>
  afterSuccess?: () => void | Promise<void>
}

// App: executes slot submission flow and optional after-success action
export function SlotSubmissionRunner(options: SlotSubmissionRunnerOptions) {
  const handleSlotSubmit = async (
    payload: SlotSubmitPayload
  ): Promise<boolean> => {
    const success = await options.submit(payload)
    if (!success) return false

    if (options.afterSuccess) {
      await options.afterSuccess()
    }

    return true
  }

  return { handleSlotSubmit }
}
