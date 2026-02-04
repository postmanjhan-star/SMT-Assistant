import {
    decideScanSuccess,
    decideScanError,
    invalidBarcodeResult,
    createVirtualMaterial,
    VIRTUAL_MATERIAL_REMARK,
} from '@/domain/material/BarcodeScanRules'
import { SlotCandidate } from '@/domain/slot/SlotBindingRules'

describe('BarcodeScanRules', () => {
    describe('decideScanSuccess', () => {
        it('returns no_match_in_grid when matchedRows is empty', () => {
            const result = decideScanSuccess({ idno: 'X' }, [])
            expect(result).toEqual({ status: 'no_match_in_grid' })
        })

        it('returns success with data when matchedRows exists', () => {
            const matchedRows: SlotCandidate[] = [
                { slotIdno: 'A', subSlotIdno: '1' },
            ]
            const material = { idno: 'MAT' }

            const result = decideScanSuccess(material, matchedRows)

            expect(result).toEqual({
                status: 'success',
                data: { materialInventory: material, matchedRows },
            })
        })
    })

    describe('decideScanError', () => {
        it('returns virtual_success in testing mode when not found', () => {
            const buildVirtual = (idno: string) => ({
                id: 1,
                idno,
                material_idno: 'M',
                material_name: 'N',
            })

            const result = decideScanError({
                errorKind: 'not_found',
                error: new Error('not found'),
                isTestingMode: true,
                barcode: 'BC123',
                createVirtualMaterial: buildVirtual,
            })

            expect(result).toEqual({
                status: 'virtual_success',
                data: {
                    materialInventory: buildVirtual('BC123'),
                    matchedRows: [],
                },
            })
        })

        it('returns api_error for api_error kind', () => {
            const error = new Error('api')
            const result = decideScanError({
                errorKind: 'api_error',
                error,
                isTestingMode: false,
                barcode: 'BC123',
                createVirtualMaterial: createVirtualMaterial,
            })

            expect(result).toEqual({ status: 'api_error', error })
        })

        it('returns api_error for not_found when not in testing mode', () => {
            const error = new Error('not found')
            const result = decideScanError({
                errorKind: 'not_found',
                error,
                isTestingMode: false,
                barcode: 'BC123',
                createVirtualMaterial: createVirtualMaterial,
            })

            expect(result).toEqual({ status: 'api_error', error })
        })

        it('returns unknown_error for unknown kind', () => {
            const error = new Error('unknown')
            const result = decideScanError({
                errorKind: 'unknown',
                error,
                isTestingMode: false,
                barcode: 'BC123',
                createVirtualMaterial: createVirtualMaterial,
            })

            expect(result).toEqual({ status: 'unknown_error', error })
        })
    })

    describe('invalidBarcodeResult', () => {
        it('returns unknown_error by default', () => {
            const result = invalidBarcodeResult()
            expect(result.status).toBe('unknown_error')
        })

        it('uses provided message for error', () => {
            const result = invalidBarcodeResult('bad barcode')
            expect(result.status).toBe('unknown_error')
            if (result.status === 'unknown_error') {
                expect((result.error as Error).message).toBe('bad barcode')
            }
        })
    })

    describe('createVirtualMaterial', () => {
        it('creates default virtual material values', () => {
            const result = createVirtualMaterial('BC123')
            expect(result).toEqual({
                id: -1,
                idno: 'BC123',
                material_idno: 'TEST-MATERIAL',
                material_name: 'TEST-MATERIAL',
                remark: VIRTUAL_MATERIAL_REMARK,
            })
        })
    })
})
