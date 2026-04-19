import type { Ref } from "vue"
import type { GridApi } from "ag-grid-community"
import type { CheckMaterialMatchEnum } from "@/application/post-production-feed/clientTypes"
import type { MaterialInventoryLike } from "@/application/post-production-feed/PostProductionFeedContext"
import type { MounterStatLike } from "@/application/post-production-feed/PostProductionFeedDeps"
import type { RowModelBase } from "@/application/post-production-feed/PostProductionFeedTypes"
import type { PostProductionCorrectState, PostProductionFeedUi } from "@/stores/postProductionFeedStore"
import type {
  UnloadReplaceRowBase,
  UnloadReplaceSlotStrategy,
  UnloadReplaceUploader,
} from "@/ui/shared/composables/useUnloadReplaceFlow"

export type AppendedMaterialUploadParams = {
  stat_id: number
  inputSlot: string
  inputSubSlot: string
  materialInventory?: MaterialInventoryLike | null
  correctState?: PostProductionCorrectState
}

export type InspectionUploadParams = {
  stat_id: number
  inputSlot: string
  inputSubSlot: string
  materialInventory: MaterialInventoryLike
  checkPackCodeMatch?: CheckMaterialMatchEnum | null
}

export type MounterMaterialQueryState<TQueryRow = unknown> = {
  rowData: Ref<TQueryRow[]>
  load: () => Promise<TQueryRow[]>
}

export type MounterPostProductionWorkflowAdapter<
  TRow extends UnloadReplaceRowBase & RowModelBase,
  TQueryRow = unknown,
> = {
  rowData: Ref<TRow[]>
  /** Ref is typed loose to match usePostProductionFeedFlow's `Ref<any | null>` and avoid Vue's UnwrapRef stripping GridApi internals. */
  gridApi: Ref<GridApi | null> | Ref<any>
  uploader: UnloadReplaceUploader
  slotStrategy: UnloadReplaceSlotStrategy<TRow>
  ui: PostProductionFeedUi
  getMounterData: () => MounterStatLike[]
  isTestingMode: () => boolean
  isMockMode: () => boolean
  isProductionStarted: () => boolean
  getOperatorIdno: () => string | null
  resetMaterialScan: () => void

  appendedMaterialUpload: (params: AppendedMaterialUploadParams) => Promise<void>
  inspectionUpload: (params: InspectionUploadParams) => Promise<void>

  onAfterReplaceGridUpdate?: (rowId: string, gridApi: GridApi, now: string) => void
  onEnterUnloadMode?: () => void

  materialQuery: MounterMaterialQueryState<TQueryRow>
  homePath: string
}
