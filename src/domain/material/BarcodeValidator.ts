export interface BarcodeValidator {
    validate(barcode: string): boolean
}

export class DefaultBarcodeValidator implements BarcodeValidator {
    validate(barcode: string): boolean {
        return barcode.length >= 8
    }
}