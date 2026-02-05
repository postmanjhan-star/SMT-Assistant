import { PanasonicMounterItemStatRead } from "@/client"
import { MaterialInventoryLike } from "./PostProductionFeedContext"
import { PostProductionFeedGridAdapter } from "@/ui/post-production/PostProductionFeedGridAdapter"
import { CorrectState, RowModelBase } from "./PostProductionFeedTypes"

export type PostProductionFeedUi = {
    success: (msg: string) => Promise<void> | Promise<boolean>
    warn: (msg: string) => boolean
    error: (msg: string) => Promise<void> | Promise<boolean>
    notifyError: (msg: string) => void
    playErrorTone: () => Promise<void>
    resetSlotMaterialFormInputs: () => void
}

export type PostProductionFeedDeps<TRow extends RowModelBase> = {
    grid: PostProductionFeedGridAdapter<TRow>
    ui: PostProductionFeedUi
    getMounterData: () => PanasonicMounterItemStatRead[]
    isTestingMode: () => boolean
    isProductionStarted: () => boolean
    getCorrectState: () => CorrectState
    setCorrectState: (state: CorrectState) => void
    clearMaterialResult: () => void
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
        correctState?: CorrectState
    }) => Promise<void>
}
