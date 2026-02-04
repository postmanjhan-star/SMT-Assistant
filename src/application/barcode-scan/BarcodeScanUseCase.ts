import { BarcodeValidator } from "@/domain/material/BarcodeValidator"
import { SlotCandidate } from "@/domain/slot/SlotBindingRules"
import { ApiError, SmtMaterialInventory, SmtService } from '@/client';
import { BarcodeScanDeps } from "./BarcodeScanDeps"

// 為 SmtMaterialInventory 擴充 remark 屬性
type SmtMaterialInventoryEx = SmtMaterialInventory & { remark?: string };

// 定義各種掃描結果的型別，以便在元件中進行模式匹配
type SuccessResult = {
    status: 'success';
    data: {
        materialInventory: SmtMaterialInventoryEx;
        matchedRows: SlotCandidate[];
    };
};

type VirtualSuccessResult = {
    status: 'virtual_success';
    data: {
        materialInventory: SmtMaterialInventoryEx;
        matchedRows: SlotCandidate[];
    };
};

type NoMatchInGridResult = { status: 'no_match_in_grid' };
type ApiErrorResult = { status: 'api_error'; error: ApiError };
type UnknownErrorResult = { status: 'unknown_error'; error: unknown };

export type ScanResult = SuccessResult | VirtualSuccessResult | NoMatchInGridResult | ApiErrorResult | UnknownErrorResult;

/**
 * 處理條碼掃描的核心業務邏輯
 */
export class BarcodeScanUseCase {
    constructor(private deps: BarcodeScanDeps) {}

    private createVirtualMaterial(idno: string): SmtMaterialInventoryEx {
        return {
            id: -1,
            idno,
            material_idno: 'TEST-MATERIAL',
            material_name: 'TEST-MATERIAL',
            remark: '[廠商測試新料]',
        } as SmtMaterialInventoryEx;
    }

    async execute(barcode: string): Promise<ScanResult> {
        const { validator, materialRepository, getMaterialMatchedRows, isTestingMode } = this.deps

        if (!validator.validate(barcode)) {
            return { status: 'unknown_error', error: new Error('invalid barcode format') }
        }

        try {
            const materialInventory = await materialRepository.fetchByBarcode(barcode)
            const matchedRows = getMaterialMatchedRows(materialInventory.material_idno);

            if (matchedRows.length === 0) {
                return { status: 'no_match_in_grid' };
            }

            return {
                status: 'success',
                data: { materialInventory, matchedRows }
            };

        } catch (error) {
            if (isTestingMode && error instanceof ApiError && error.status === 404) {
                const virtualMaterial = this.createVirtualMaterial(barcode);
                return {
                    status: 'virtual_success',
                    data: { materialInventory: virtualMaterial, matchedRows: [] },
                };
            }

            if (error instanceof ApiError) {
                return { status: 'api_error', error };
            }

            return { status: 'unknown_error', error };
        }
    }
}
