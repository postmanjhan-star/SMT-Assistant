import { SmtService, SmtMaterialInventory } from "@/client";
import { MaterialRepository } from "@/application/barcode-scan/BarcodeScanDeps";

export class ApiMaterialRepository implements MaterialRepository {
    async fetchByBarcode(barcode: string): Promise<SmtMaterialInventory> {
        return await SmtService.getMaterialInventoryForSmt({ materialInventoryIdno: barcode });
    }
}