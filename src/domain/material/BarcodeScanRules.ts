import { SlotCandidate } from "@/domain/slot/SlotBindingRules"

export type MaterialInventoryBase = {
    id: number
    idno: string
    material_idno: string
    material_name: string
    remark?: string
}

export type ScanSuccess<TMaterial> = {
    status: 'success'
    data: {
        materialInventory: TMaterial
        matchedRows: SlotCandidate[]
    }
}

export type VirtualSuccess<TMaterial> = {
    status: 'virtual_success'
    data: {
        materialInventory: TMaterial
        matchedRows: SlotCandidate[]
    }
}

export type NoMatchInGridResult = { status: 'no_match_in_grid' }
export type ApiErrorResult = { status: 'api_error'; error: unknown }
export type UnknownErrorResult = { status: 'unknown_error'; error: unknown }

export type ScanResult<TMaterial> =
    | ScanSuccess<TMaterial>
    | VirtualSuccess<TMaterial>
    | NoMatchInGridResult
    | ApiErrorResult
    | UnknownErrorResult

export type ScanErrorKind = 'not_found' | 'api_error' | 'unknown'

export const VIRTUAL_MATERIAL_REMARK = '[虛擬測試物料]'

export const createVirtualMaterial = (idno: string): MaterialInventoryBase => ({
    id: -1,
    idno,
    material_idno: 'TEST-MATERIAL',
    material_name: 'TEST-MATERIAL',
    remark: VIRTUAL_MATERIAL_REMARK,
})

export const invalidBarcodeResult = (
    message: string = 'invalid barcode format'
): ScanResult<never> => ({
    status: 'unknown_error',
    error: new Error(message),
})

export const decideScanSuccess = <TMaterial>(
    materialInventory: TMaterial,
    matchedRows: SlotCandidate[]
): ScanResult<TMaterial> => {
    if (matchedRows.length === 0) {
        return { status: 'no_match_in_grid' }
    }

    return {
        status: 'success',
        data: { materialInventory, matchedRows },
    }
}

export const decideScanError = <TMaterial>(input: {
    errorKind: ScanErrorKind
    error: unknown
    isTestingMode: boolean
    barcode: string
    createVirtualMaterial: (barcode: string) => TMaterial
}): ScanResult<TMaterial> => {
    if (input.isTestingMode && input.errorKind === 'not_found') {
        return {
            status: 'virtual_success',
            data: {
                materialInventory: input.createVirtualMaterial(input.barcode),
                matchedRows: [],
            },
        }
    }

    if (input.errorKind === 'api_error' || input.errorKind === 'not_found') {
        return { status: 'api_error', error: input.error }
    }

    return { status: 'unknown_error', error: input.error }
}
