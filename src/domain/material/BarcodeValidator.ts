export interface BarcodeValidator {
    validate(barcode: string): boolean
}

export class DefaultBarcodeValidator implements BarcodeValidator {
    validate(barcode: string): boolean {
        return barcode.length >= 8
    }
}

export class SimpleBarcodeValidator implements BarcodeValidator {
    validate(barcode: string): boolean {
        return !!barcode && barcode.trim().length > 0
    }
}