import { ref } from "vue"
import { useRouter } from "vue-router"
import type { RowModelBase } from "@/application/post-production-feed/PostProductionFeedTypes"
import { usePostProductionFeedFlow } from "@/ui/shared/composables/usePostProductionFeedFlow"
import {
  useUnloadReplaceFlow,
  type UnloadReplaceRowBase,
} from "@/ui/shared/composables/useUnloadReplaceFlow"
import type { MounterPostProductionWorkflowAdapter } from "./MounterPostProductionWorkflowAdapter"

export function useMounterPostProductionWorkflowCore<
  TRow extends UnloadReplaceRowBase & RowModelBase,
  TQueryRow = unknown,
>(
  adapter: MounterPostProductionWorkflowAdapter<TRow, TQueryRow>,
) {
  const router = useRouter()

  const showMaterialQueryModal = ref(false)

  function fetchMaterialInventory(code: string): Promise<unknown> {
    return adapter.uploader.fetchMaterialInventory(code)
  }

  const { submit: submitPostProductionFeed } = usePostProductionFeedFlow<TRow>({
    gridApi: adapter.gridApi,
    rowData: adapter.rowData,
    ui: adapter.ui,
    getMounterData: adapter.getMounterData,
    isTestingMode: adapter.isTestingMode,
    isProductionStarted: adapter.isProductionStarted,
    resetMaterialScan: adapter.resetMaterialScan,
    getOperatorIdno: adapter.getOperatorIdno,
    inspectionUpload: adapter.inspectionUpload,
    appendedMaterialUpload: adapter.appendedMaterialUpload,
  })

  const unloadReplace = useUnloadReplaceFlow<TRow>({
    getGridApi: () => adapter.gridApi.value,
    slotStrategy: adapter.slotStrategy,
    uploader: adapter.uploader,
    getOperatorId: adapter.getOperatorIdno,
    isTestingMode: adapter.isTestingMode,
    isMockMode: adapter.isMockMode,
    ui: { success: adapter.ui.success, error: adapter.ui.error },
    onEnterUnloadMode: adapter.onEnterUnloadMode,
    onAfterReplaceGridUpdate: adapter.onAfterReplaceGridUpdate,
  })

  function onMaterialQuery() {
    showMaterialQueryModal.value = true
  }

  function onClickBackArrow() {
    router.push(adapter.homePath)
  }

  return {
    fetchMaterialInventory,
    submitPostProductionFeed,
    ...unloadReplace,
    showMaterialQueryModal,
    onMaterialQuery,
    onClickBackArrow,
    materialQueryRowData: adapter.materialQuery.rowData,
    fetchMaterialQueryLogs: adapter.materialQuery.load,
  }
}
