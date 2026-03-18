import type { Ref } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useDialog } from "naive-ui"
import { useUiNotifier } from "@/ui/shared/composables/useUiNotifier"
import type { ProductionLifecycleUseCase } from "@/application/preproduction/ProductionLifecycleUseCase"

export type UseProductionLifecycleUiOptions = {
  lifecycleUseCase: ProductionLifecycleUseCase
  productionUuid: Ref<string>
  afterStop?: () => void
}

export function useProductionLifecycleUi(options: UseProductionLifecycleUiOptions) {
  const route = useRoute()
  const router = useRouter()
  const dialog = useDialog()
  const { success: showSuccess, error: showError } = useUiNotifier()

  function handleProductionStarted(uuid: string): void {
    const intent = options.lifecycleUseCase.handleStarted({
      uuid,
      currentPath: route.path,
      currentQuery: route.query as Record<string, any>,
    })
    router.replace(intent.replace)
    router.push(intent.push)
  }

  function onStopProduction(): void {
    if (!options.productionUuid.value) {
      showError("沒有生產ID，無法停止")
      return
    }
    dialog.warning({
      title: "結束生產確認",
      content: "確定要結束生產嗎？",
      positiveText: "確定",
      negativeText: "取消",
      onPositiveClick: async () => {
        try {
          await options.lifecycleUseCase.stop()
          showSuccess("生產已結束")
          options.afterStop?.()
        } catch (error) {
          showError("停止生產失敗")
          console.error(error)
        }
      },
      onNegativeClick: () => undefined,
    })
  }

  return { handleProductionStarted, onStopProduction }
}
