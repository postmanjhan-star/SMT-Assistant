import type { Ref } from 'vue'
import { NormalModeStrategy } from '@/application/post-production-feed/NormalModeStrategy'
import { TestingModeStrategy } from '@/application/post-production-feed/TestingModeStrategy'
import type {
  PostProductionFeedContext,
  MaterialInventoryLike,
} from '@/application/post-production-feed/PostProductionFeedContext'
import type { RowModelBase } from '@/application/post-production-feed/PostProductionFeedTypes'
import type { PostProductionFeedDeps } from '@/application/post-production-feed/PostProductionFeedDeps'
import { PostProductionFeedGridAdapter } from '@/ui/workflows/post-production/panasonic/PostProductionFeedGridAdapter'
import {
  usePostProductionFeedStore,
  type PostProductionCorrectState,
  type PostProductionFeedUi,
} from '@/stores/postProductionFeedStore'
import type { PanasonicMounterItemStatRead } from '@/client'
import { PostProductionFeedFlow } from '@/application/post-production-feed/PostProductionFeedFlow'

export type PostProductionFeedFlowOptions<TRow extends RowModelBase> = {
  gridApi: Ref<any | null>
  rowData: Ref<TRow[]>
  ui: PostProductionFeedUi
  getMounterData: () => PanasonicMounterItemStatRead[]
  isTestingMode: () => boolean
  isProductionStarted: () => boolean
  resetMaterialScan: () => void
  inspectionUpload: (params: {
    stat_id: number
    inputSlot: string
    inputSubSlot: string
    materialInventory: MaterialInventoryLike
  }) => Promise<void>
  appendedMaterialUpload: (params: {
    stat_id: number
    inputSlot: string
    inputSubSlot: string
    materialInventory?: MaterialInventoryLike | null
    correctState?: PostProductionCorrectState
  }) => Promise<void>
}

// UI-only: connects grid + UI to app flow
export function usePostProductionFeedFlow<TRow extends RowModelBase>(
  options: PostProductionFeedFlowOptions<TRow>
) {
  const store = usePostProductionFeedStore()

  const gridAdapter = new PostProductionFeedGridAdapter<TRow>(
    () => options.gridApi.value,
    () => options.rowData.value
  )
  store.bindGrid(gridAdapter)
  store.bindUi(options.ui)

  const deps: PostProductionFeedDeps = {
    store,
    getMounterData: options.getMounterData,
    isTestingMode: options.isTestingMode,
    isProductionStarted: options.isProductionStarted,
    resetMaterialScan: options.resetMaterialScan,
    inspectionUpload: options.inspectionUpload,
    appendedMaterialUpload: options.appendedMaterialUpload,
  }

  const getStrategy = () =>
    options.isTestingMode()
      ? new TestingModeStrategy(deps)
      : new NormalModeStrategy(deps)

  const flow = new PostProductionFeedFlow<TRow>(deps, getStrategy)

  const submit = (ctx: PostProductionFeedContext) => flow.execute(ctx)

  return { submit }
}
