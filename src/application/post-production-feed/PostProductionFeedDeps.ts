import { PanasonicMounterItemStatRead } from "@/client"
import { MaterialInventoryLike } from "./PostProductionFeedContext"
import type {
    PostProductionFeedStore,
    PostProductionCorrectState,
} from "@/stores/postProductionFeedStore"

export type PostProductionFeedDeps = {
    store: PostProductionFeedStore
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
