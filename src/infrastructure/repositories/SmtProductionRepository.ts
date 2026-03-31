import type {
    PanasonicFeedRecordCreate,
    SmtMaterialInventory,
} from "@/client"
import { SmtService } from "@/client"
import type { FeedRecordPayload } from "@/domain/production/PostProductionFeedRecord"

export type SmtProductionRepository = {
    fetchMaterialInventory: (
        materialInventoryIdno: string
    ) => Promise<SmtMaterialInventory>
    addPanasonicMounterItemStatRoll: (
        payload: FeedRecordPayload
    ) => Promise<unknown>
}

export class ApiSmtProductionRepository implements SmtProductionRepository {
    async fetchMaterialInventory(
        materialInventoryIdno: string
    ): Promise<SmtMaterialInventory> {
        return SmtService.getMaterialInventoryForSmt({
            materialInventoryIdno,
        })
    }

    async addPanasonicMounterItemStatRoll(
        payload: FeedRecordPayload
    ): Promise<unknown> {
        return SmtService.addPanasonicMounterItemStatRoll({
            requestBody: payload as unknown as PanasonicFeedRecordCreate,
        })
    }
}
