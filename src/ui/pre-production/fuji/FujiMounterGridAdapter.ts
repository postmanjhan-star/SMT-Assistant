import { CheckMaterialMatchEnum } from '@/client'

export class FujiMounterGridAdapter<
    Row extends {
        correct: CheckMaterialMatchEnum | null
        materialInventoryIdno: string | null
        remark?: string
    }
> {
    constructor(private api: any) {}

    updateRow(row: Row) {
        this.api.applyTransaction({ update: [row] })
    }

    markMatched(row: Row, inventoryIdno: string) {
        row.materialInventoryIdno = inventoryIdno
        row.correct = CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK
        this.updateRow(row)
    }

    markTesting(row: Row, inventoryIdno: string) {
        row.materialInventoryIdno = inventoryIdno
        row.correct = CheckMaterialMatchEnum.TESTING_MATERIAL_PACK
        row.remark = '[廠商測試新料]'
        this.updateRow(row)
    }

    markUnmatched(row: Row, inventoryIdno: string) {
        row.materialInventoryIdno = inventoryIdno
        row.correct = CheckMaterialMatchEnum.UNMATCHED_MATERIAL_PACK
        this.updateRow(row)
    }
}
