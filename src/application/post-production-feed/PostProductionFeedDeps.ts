import { GridApi } from "ag-grid-community"
import { PanasonicMounterItemStatRead } from "@/client"
import { MaterialInventoryLike } from "./PostProductionFeedContext"

export type CorrectState = "true" | "false" | "warning"

export type RowModelBase = {
    slotIdno: string
    subSlotIdno: string
    appendedMaterialInventoryIdno?: string | null
    inspectMaterialPackCode?: string
    inspectTime?: string | null
    inspectCount?: number | null
    remark?: string
}

export type PostProductionFeedDeps<TRow extends RowModelBase> = {
    getGridApi: () => GridApi
    getRowData: () => TRow[]
    getMounterData: () => PanasonicMounterItemStatRead[]
    isTestingMode: () => boolean
    isProductionStarted: () => boolean
    getCorrectState: () => CorrectState
    setCorrectState: (state: CorrectState) => void
    clearMaterialResult: () => void
    resetMaterialScan: () => void
    showSuccess: (msg: string) => Promise<void> | Promise<boolean>
    showWarn: (msg: string) => boolean
    showError: (msg: string) => Promise<void> | Promise<boolean>
    notifyError: (msg: string) => void
    playErrorTone: () => Promise<void>
    resetSlotMaterialFormInputs: () => void
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
