import { BarcodeValidator } from "@/domain/material/BarcodeValidator"
import {
    ScanResult,
    decideScanError,
    decideScanSuccess,
    createVirtualMaterial,
    invalidBarcodeResult,
    ScanErrorKind,
} from "@/domain/material/BarcodeScanRules"
import { ApiError, SmtMaterialInventory } from '@/client';
import { BarcodeScanDeps } from "./BarcodeScanDeps"

// SmtMaterialInventory 擴增 remark 屬性
type SmtMaterialInventoryEx = SmtMaterialInventory & { remark?: string };

/**
 * 掃描單包條碼的核心業務邏輯
 */
export class BarcodeScanUseCase {
    constructor(private deps: BarcodeScanDeps) {}

    async execute(barcode: string): Promise<ScanResult<SmtMaterialInventoryEx>> {
        const { validator, materialRepository, getMaterialMatchedRows, isTestingMode } = this.deps

        if (!validator.validate(barcode)) {
            return invalidBarcodeResult()
        }

        try {
            const materialInventory = await materialRepository.fetchByBarcode(barcode)
            const matchedRows = getMaterialMatchedRows(materialInventory.material_idno);

            return decideScanSuccess(materialInventory, matchedRows)

        } catch (error) {
            const errorKind: ScanErrorKind =
                error instanceof ApiError
                    ? error.status === 404
                        ? 'not_found'
                        : 'api_error'
                    : 'unknown'

            const buildVirtualMaterial = (idno: string): SmtMaterialInventoryEx =>
                createVirtualMaterial(idno) as SmtMaterialInventoryEx

            return decideScanError({
                errorKind,
                error,
                isTestingMode,
                barcode,
                createVirtualMaterial: buildVirtualMaterial,
            })
        }
    }
}
