import { SmtService } from "@/client"
import {
    buildPanasonicMaterialQueryRows,
    type PanasonicMaterialQueryRowModel,
} from "@/domain/material/buildPanasonicMaterialQueryRows"

export async function loadPanasonicMaterialQueryRows(
    uuid: string
): Promise<PanasonicMaterialQueryRowModel[]> {
    const normalized = uuid?.toString().trim()
    if (!normalized) {
        throw new Error("uuid is required")
    }

    const logs = await SmtService.getTheStatsOfLogsByUuid({ uuid: normalized })
    return buildPanasonicMaterialQueryRows(logs)
}
