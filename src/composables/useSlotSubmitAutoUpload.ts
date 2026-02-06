import { onBeforeUnmount } from 'vue'
import { useSlotSubmitStore } from '@/stores/slotSubmitStore'

type SlotSubmitAutoUploadOptions = {
    autoUpload: (rows: any[]) => void
    delayMs?: number
}

export function useSlotSubmitAutoUpload(options: SlotSubmitAutoUploadOptions) {
    const store = useSlotSubmitStore()
    let timer: ReturnType<typeof setTimeout> | null = null

    const delayMs = options.delayMs ?? 300

    const scheduleCheck = () => {
        if (timer) clearTimeout(timer)

        timer = setTimeout(() => {
            timer = null
            const { shouldAutoUpload } = store.checkAutoUpload()
            if (!shouldAutoUpload) return

            const rows = store.pendingAutoUpload
            if (rows && rows.length > 0) {
                options.autoUpload(rows)
            }
            store.clearPendingAutoUpload()
        }, delayMs)
    }

    onBeforeUnmount(() => {
        if (timer) clearTimeout(timer)
    })

    return { scheduleCheck }
}
