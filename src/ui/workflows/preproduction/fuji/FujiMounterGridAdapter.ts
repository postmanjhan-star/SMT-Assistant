// eslint-disable-next-line no-restricted-imports -- [Phase-1 whitelist] tracked in REFACTORING_BASELINE.md, fix in Phase 3
import { CheckMaterialMatchEnum } from '@/client'
import type { SlotSubmitGridPort } from '@/application/slot-submit/SlotSubmitDeps'
import { parseFujiSlotIdno } from '@/domain/slot/FujiSlotParser'

export class FujiMounterGridAdapter<
    Row extends {
        correct: CheckMaterialMatchEnum | null
        materialInventoryIdno: string | null
        remark?: string
        mounterIdno?: string
        stage?: string
        slot?: string | number
        operationTime?: string | null
    }
> implements SlotSubmitGridPort {
    constructor(private api: any) {}

    private updateRow(row: Row) {
        this.api.applyTransaction({ update: [row] })
    }

    private markTesting(row: Row, inventoryIdno: string) {
        row.materialInventoryIdno = inventoryIdno
        row.correct = CheckMaterialMatchEnum.TESTING_MATERIAL_PACK
        row.remark = '[廠商測試新料]'
        this.updateRow(row)
    }

    private markUnmatched(row: Row, inventoryIdno: string) {
        row.materialInventoryIdno = inventoryIdno
        row.correct = CheckMaterialMatchEnum.UNMATCHED_MATERIAL_PACK
        this.updateRow(row)
    }

    private clearErrorMaterialInventory(
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

    private findRow(rowId: string): Row | undefined {
        const parsed = parseFujiSlotIdno(rowId)
        if (!parsed) return undefined
        let result: Row | undefined
        this.api.forEachNode((node: { data?: Row }) => {
            const row = node.data
            if (!row || result) return
            if (
                row.mounterIdno === parsed.machineIdno &&
                row.stage === parsed.stage &&
                row.slot === parsed.slot
            ) {
                result = row
            }
        })
        return result
    }

    hasRow(rowId: string): boolean {
        return !!this.findRow(rowId)
    }

    cleanErrorMaterialInventory(materialIdno: string, slot: string, subSlot: string | null): void {
        const lastDash = slot.lastIndexOf('-')
        if (lastDash < 0) return
        const mounterIdno = slot.substring(0, lastDash)
        const stage = slot.substring(lastDash + 1)
        this.clearErrorMaterialInventory(materialIdno, { mounterIdno, stage, slot: subSlot ?? '' })
    }

    applyBindingSuccess(slotIdno: string, materialIdno: string, remark: string): boolean {
        const row = this.findRow(slotIdno)
        if (!row) return false
        row.materialInventoryIdno = materialIdno
        row.correct = CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK
        row.operationTime = new Date().toISOString()
        if (remark) row.remark = remark
        this.updateRow(row)
        return true
    }

    applyWarningBinding(slotIdno: string, materialIdno: string, _remark: string): boolean {
        const row = this.findRow(slotIdno)
        if (!row) return false
        this.markTesting(row, materialIdno)
        return true
    }

    markMismatch(slot: string, subSlot: string | null, materialIdno: string): void {
        const slotKey = `${slot}-${subSlot ?? ''}`
        const row = this.findRow(slotKey)
        if (!row) return
        this.markUnmatched(row, materialIdno)
    }

    deselectRow(slotIdno: string): boolean {
        return !!this.findRow(slotIdno)
    }

    checkAllCorrect(): { allCorrect: boolean; invalidSlots: string[] } {
        const invalidSlots: string[] = []
        this.api.forEachNode((node: { data?: Row }) => {
            const row = node.data
            if (!row) return
            if (row.correct !== CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK) {
                invalidSlots.push(`${row.mounterIdno}-${row.stage}-${row.slot}`)
            }
        })
        return { allCorrect: invalidSlots.length === 0, invalidSlots }
    }

    getAllRowsData<T = any>(): T[] {
        const rows: T[] = []
        this.api.forEachNode((node: { data?: T }) => { if (node.data) rows.push(node.data) })
        return rows
    }
}
