import type { Ref } from "vue"
import { NormalModeStrategy } from "@/application/post-production-feed/NormalModeStrategy"
import { TestingModeStrategy } from "@/application/post-production-feed/TestingModeStrategy"
import { PostProductionFeedUseCase } from "@/application/post-production-feed/PostProductionFeedUseCase"
import type {
    PostProductionFeedContext,
    MaterialInventoryLike,
} from "@/application/post-production-feed/PostProductionFeedContext"
import type {
    PostProductionFeedDeps,
    PostProductionFeedUi,
} from "@/application/post-production-feed/PostProductionFeedDeps"
import { PostProductionFeedGridAdapter } from "@/ui/post-production/PostProductionFeedGridAdapter"
import {
    usePostProductionFeedStore,
    type PostProductionCorrectState,
} from "@/stores/postProductionFeedStore"
import type { PanasonicMounterItemStatRead } from "@/client"

type UsePostProductionFeedOptions<TRow> = {
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

export function usePostProductionFeed<TRow>(
    options: UsePostProductionFeedOptions<TRow>
) {
    const store = usePostProductionFeedStore()

    const gridAdapter = new PostProductionFeedGridAdapter<TRow>(
        () => options.gridApi.value,
        () => options.rowData.value
    )
    store.bindGrid(gridAdapter)

    const deps: PostProductionFeedDeps = {
        store,
        ui: options.ui,
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

    const useCase = new PostProductionFeedUseCase<TRow>(deps, getStrategy)

    const submit = (ctx: PostProductionFeedContext) => useCase.execute(ctx)

    return { submit }
}
