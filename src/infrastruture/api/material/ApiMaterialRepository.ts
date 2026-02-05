import { ApiError, SmtService } from "@/client"
import {
    MaterialRepository,
    MaterialRepositoryResult,
} from "@/application/barcode-scan/BarcodeScanDeps"

export class ApiMaterialRepository implements MaterialRepository {
    async fetchByBarcode(barcode: string): Promise<MaterialRepositoryResult> {
        try {
            const materialInventory = await SmtService.getMaterialInventoryForSmt(
                { materialInventoryIdno: barcode }
            )
            return { kind: "ok", materialInventory }
        } catch (error) {
            if (error instanceof ApiError) {
                const errorKind = error.status === 404 ? "not_found" : "api_error"
                return { kind: "error", errorKind, error }
            }
            return { kind: "error", errorKind: "unknown", error }
        }
    }
}
