import { watch } from 'vue'
import { useSlotSubmitStore } from '@/stores/slotSubmitStore'

export type SlotSubmitFeedbackHandlers = {
    success?: (msg: string) => Promise<void> | void
    warn?: (msg: string) => Promise<void> | void
    error?: (msg: string) => Promise<void> | void
}

export function useSlotResultNotifier(handlers: SlotSubmitFeedbackHandlers) {
    const store = useSlotSubmitStore()

    watch(
        () => store.lastResult,
        async (result) => {
            if (!result) return

            try {
                if (result.type === 'success') {
                    await handlers.success?.(result.message)
                } else if (result.type === 'warn') {
                    await handlers.warn?.(result.message)
                } else if (result.type === 'error') {
                    await handlers.error?.(result.message)
                }
            } finally {
                if (store.lastResult === result) {
                    store.clearLastResult()
                }
            }
        }
    )

    return { store }
}
