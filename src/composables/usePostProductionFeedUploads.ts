import type { MaterialInventoryLike } from "@/application/post-production-feed/PostProductionFeedContext"
import {
    uploadAppendRecord,
    uploadInspectionRecord,
} from "@/application/post-production-feed/PostProductionFeedRecordUseCase"
import type { PostProductionCorrectState } from "@/stores/postProductionFeedStore"

export function usePostProductionFeedUploads() {
    const inspectionUpload = async (params: {
        stat_id: number
        inputSlot: string
        inputSubSlot: string
        materialInventory: MaterialInventoryLike
    }) => {
        await uploadInspectionRecord({
            statId: params.stat_id,
            slotIdno: params.inputSlot,
            subSlotIdno: params.inputSubSlot,
            materialPackCode: params.materialInventory.idno,
        })
    }

    const appendedMaterialUpload = async (params: {
        stat_id: number
        inputSlot: string
        inputSubSlot: string
        materialInventory?: MaterialInventoryLike | null
        correctState?: PostProductionCorrectState
    }) => {
        const materialPackCode = params.materialInventory?.idno
        if (!materialPackCode) {
            throw new Error("materialInventory is required")
        }

        await uploadAppendRecord({
            statId: params.stat_id,
            slotIdno: params.inputSlot,
            subSlotIdno: params.inputSubSlot,
            materialPackCode,
            correctState: params.correctState ?? null,
            feedMaterialPackType: "new",
        })
    }

    return { inspectionUpload, appendedMaterialUpload }
}
