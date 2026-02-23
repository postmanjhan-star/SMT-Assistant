import { CheckMaterialMatchEnum } from '@/client'

export class FujiMounterGridAdapter<
    Row extends {
        correct: CheckMaterialMatchEnum | null
        materialInventoryIdno: string | null
        remark?: string
        mounterIdno?: string
        stage?: string
        slot?: string | number
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

    clearErrorMaterialInventory(
        currentPackCode: string,
        keep: { mounterIdno: string; stage: string; slot: string | number }
    ) {
        if (!currentPackCode) return
        this.api.forEachNode((node: { data?: Row }) => {
            const row = node?.data
            if (!row) return
            if (row.materialInventoryIdno !== currentPackCode) return

            const isSameSlot =
                row.mounterIdno === keep.mounterIdno &&
                row.stage === keep.stage &&
                String(row.slot) === String(keep.slot)
            if (isSameSlot) return

            if (row.correct === CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK) return

            row.materialInventoryIdno = ''
            row.correct = null
            if (row.remark !== undefined) row.remark = ''
            this.updateRow(row)
        })
    }
}
