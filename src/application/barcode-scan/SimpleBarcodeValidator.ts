import { BarcodeValidator } from "@/domain/material/BarcodeValidator"

export class SimpleBarcodeValidator implements BarcodeValidator {
    validate(barcode: string): boolean {
        return !!barcode && barcode.trim().length > 0;
    }
}