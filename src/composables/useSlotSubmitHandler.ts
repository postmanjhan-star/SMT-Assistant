export type SlotSubmitPayload = {
    slotIdno: string
    slot: string
    subSlot: string
}

type SlotSubmitHandlerOptions = {
    submit: (payload: SlotSubmitPayload) => Promise<boolean>
    afterSuccess?: () => void | Promise<void>
}

export function useSlotSubmitHandler(options: SlotSubmitHandlerOptions) {
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
