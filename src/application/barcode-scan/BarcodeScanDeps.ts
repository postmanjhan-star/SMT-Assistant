import { BarcodeValidator } from "@/domain/material/BarcodeValidator"
import { SlotCandidate } from "@/domain/slot/SlotBindingRules"
import { ApiError, SmtMaterialInventory, SmtService } from '@/client'

export interface MaterialRepository {
    fetchByBarcode(barcode: string): Promise<SmtMaterialInventory>;
}

export interface BarcodeScanDeps {
    validator: BarcodeValidator;
    materialRepository: MaterialRepository;
    getMaterialMatchedRows: (materialIdno: string) => SlotCandidate[];
    isTestingMode: boolean;
}

export interface BarcodeScanDeps {
    validator: BarcodeValidator
    materialRepository: {
        fetchByBarcode(barcode: string): Promise<SmtMaterialInventory>
    }
    getMaterialMatchedRows: (materialIdno: string) => SlotCandidate[]
    isTestingMode: boolean
}
