import type {
    PanasonicFeedRecordCreate,
    SmtMaterialInventory,
} from "@/client"
import { SmtService } from "@/client"

export type SmtProductionRepository = {
    fetchMaterialInventory: (
        materialInventoryIdno: string
    ) => Promise<SmtMaterialInventory>
    addPanasonicMounterItemStatRoll: (
        payload: PanasonicFeedRecordCreate
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
        payload: PanasonicFeedRecordCreate
    ): Promise<unknown> {
        return SmtService.addPanasonicMounterItemStatRoll({
            requestBody: payload,
        })
    }
}
