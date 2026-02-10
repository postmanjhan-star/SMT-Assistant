import { BarcodeValidator } from "@/domain/material/BarcodeValidator"
import { ScanErrorKind } from "@/domain/material/BarcodeScanRules"
import { SlotCandidate } from "@/domain/slot/SlotBindingRules"
import { SmtMaterialInventory } from "@/client"

export type MaterialRepositoryResult =
    | { kind: "ok"; materialInventory: SmtMaterialInventory }
    | { kind: "error"; errorKind: ScanErrorKind; error: unknown }

export interface MaterialRepository {
    fetchByBarcode(barcode: string): Promise<MaterialRepositoryResult>
}

export interface BarcodeScanDeps<TRow = SlotCandidate> {
    validator: BarcodeValidator
    materialRepository: MaterialRepository
    getMaterialMatchedRows: (materialIdno: string) => TRow[]
    isTestingMode: boolean
}
