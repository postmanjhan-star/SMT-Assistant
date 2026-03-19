import { MaterialInventoryLike } from "./PostProductionFeedContext"
import type {
    PostProductionFeedStore,
    PostProductionCorrectState,
} from "@/stores/postProductionFeedStore"

export type MounterStatLike = {
    id: number
    slot_idno?: string | null
    sub_slot_idno?: string | null
    feed_records?: Array<{
        feed_material_pack_type?: string | null
        material_pack_code?: string | null
    }>
}

export type PostProductionFeedDeps = {
  store: PostProductionFeedStore
  getMounterData: () => MounterStatLike[]
  isTestingMode: () => boolean
  isProductionStarted: () => boolean
  resetMaterialScan: () => void
  getOperatorIdno: () => string | null
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
