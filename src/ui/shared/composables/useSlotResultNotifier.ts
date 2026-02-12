import { watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useSlotSubmitStore } from '@/stores/slotSubmitStore'

export type SlotSubmitFeedbackHandlers = {
    success?: (msg: string) => Promise<void> | void
    warn?: (msg: string) => Promise<void> | void
    error?: (msg: string) => Promise<void> | void
}

export function useSlotResultNotifier(handlers: SlotSubmitFeedbackHandlers) {
    const store = useSlotSubmitStore()
    const { lastResult } = storeToRefs(store)

    watch(
        lastResult,
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
                if (lastResult.value === result) {
                    store.clearLastResult()
                }
            }
        },
        { flush: 'sync' }
    )

    return { store }
}
