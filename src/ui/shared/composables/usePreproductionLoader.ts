import { ref, onMounted } from "vue"
import { ApiError } from "@/client"

export type PreproductionLoaderOptions = {
  load: () => Promise<void>
  notFoundStatuses?: number[]
  onNotFound: () => void
  onOtherError?: (error: unknown) => void
}

export function usePreproductionLoader(options: PreproductionLoaderOptions) {
  const loading = ref(false)

  onMounted(async () => {
    loading.value = true
    try {
      await options.load()
    } catch (e) {
      const statuses = options.notFoundStatuses ?? [404]
      if (e instanceof ApiError && statuses.includes(e.status)) {
        options.onNotFound()
      } else {
        options.onOtherError?.(e)
      }
    } finally {
      loading.value = false
    }
  })

  return { loading }
}
