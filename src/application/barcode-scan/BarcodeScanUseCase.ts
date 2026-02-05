import {
    ScanResult,
    decideScanError,
    decideScanSuccess,
    createVirtualMaterial,
    invalidBarcodeResult,
} from "@/domain/material/BarcodeScanRules"
import { SmtMaterialInventory } from "@/client"
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
            const fetchResult = await materialRepository.fetchByBarcode(barcode)

            if (fetchResult.kind === "ok") {
                const matchedRows = getMaterialMatchedRows(
                    fetchResult.materialInventory.material_idno
                )
                return decideScanSuccess(fetchResult.materialInventory, matchedRows)
            }

            const buildVirtualMaterial = (idno: string): SmtMaterialInventoryEx =>
                createVirtualMaterial(idno) as SmtMaterialInventoryEx

            return decideScanError({
                errorKind: fetchResult.errorKind,
                error: fetchResult.error,
                isTestingMode,
                barcode,
                createVirtualMaterial: buildVirtualMaterial,
            })
        } catch (error) {
            const buildVirtualMaterial = (idno: string): SmtMaterialInventoryEx =>
                createVirtualMaterial(idno) as SmtMaterialInventoryEx

            return decideScanError({
                errorKind: "unknown",
                error,
                isTestingMode,
                barcode,
                createVirtualMaterial: buildVirtualMaterial,
            })
        }
    }
}
