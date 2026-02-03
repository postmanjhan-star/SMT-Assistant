export interface BarcodeValidator {
    validate(barcode: string): boolean;
}