import { PanasonicMounterItemStatRead } from "@/client"
import { MaterialInventoryLike } from "./PostProductionFeedContext"
import type {
    PostProductionFeedStore,
    PostProductionCorrectState,
} from "@/stores/postProductionFeedStore"

export type PostProductionFeedUi = {
    success: (msg: string) => Promise<void> | Promise<boolean>
    warn: (msg: string) => boolean
    error: (msg: string) => Promise<void> | Promise<boolean>
    notifyError: (msg: string) => void
    playErrorTone: () => Promise<void>
    resetSlotMaterialFormInputs: () => void
}

export type PostProductionFeedDeps = {
    store: PostProductionFeedStore
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
