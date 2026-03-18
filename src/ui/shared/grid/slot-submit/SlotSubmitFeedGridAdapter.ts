import { GridApi } from "ag-grid-community"
import type { SlotSubmitGridPort } from '@/application/slot-submit/SlotSubmitDeps'

export class SlotSubmitFeedGridAdapter implements SlotSubmitGridPort {
    constructor(
        private api: GridApi,
        private getOperatorIdno: () => string | null | undefined = () => null
    ) {}

    private parseRowId(rowId: string): { slot: string; subSlot: string } | null {
        const trimmed = rowId?.toString().trim()
        if (!trimmed) return null

        const lastDash = trimmed.lastIndexOf("-")
        if (lastDash === -1) {
            return { slot: trimmed, subSlot: "" }
        }

        const slot = trimmed.slice(0, lastDash)
        const subSlot = trimmed.slice(lastDash + 1)
        return { slot, subSlot }
    }

    private getRowNodeById(rowId: string) {
        const direct = this.api.getRowNode(rowId)
        if (direct) return direct

        const parsed = this.parseRowId(rowId)
        if (!parsed) return null

        let found: any = null
        this.api.forEachNode((node) => {
            if (found) return
            const nodeSlot = String(node.data?.slotIdno ?? "").trim()
            const nodeSubSlot = String(node.data?.subSlotIdno ?? "").trim()
            if (nodeSlot === parsed.slot && nodeSubSlot === parsed.subSlot) {
                found = node
            }
        })

        return found
    }

    hasRow(rowId: string): boolean {
        return !!this.getRowNodeById(rowId)
    }

    applyBindingSuccess(
        rowId: string,
        materialInventoryIdno?: string,
        remark?: string
    ): boolean {
        const rowNode = this.getRowNodeById(rowId)
        if (!rowNode) return false

        const operatorIdno = this.getOperatorIdno()
        if (operatorIdno) {
            rowNode.setDataValue("operatorIdno", operatorIdno)
        }
        rowNode.setDataValue('materialInventoryIdno', materialInventoryIdno ?? '')
        rowNode.setDataValue('remark', remark ?? '')
        rowNode.setDataValue('correct', 'true')
        rowNode.setDataValue('firstAppendTime', new Date().toISOString())
        return true
    }

    applyWarningBinding(
        rowId: string,
        materialInventoryIdno: string,
        remark: string
    ): boolean {
        const rowNode = this.getRowNodeById(rowId)
        if (!rowNode) return false

        const operatorIdno = this.getOperatorIdno()
        if (operatorIdno) {
            rowNode.setDataValue("operatorIdno", operatorIdno)
        }
        rowNode.setDataValue('correct', 'warning')
        rowNode.setDataValue('remark', remark)
        rowNode.setDataValue('materialInventoryIdno', materialInventoryIdno ?? '')
        rowNode.setDataValue('firstAppendTime', new Date().toISOString())
        return true
    }

    deselectRow(rowId: string): boolean {
        const rowNode = this.getRowNodeById(rowId)
        if (!rowNode) return false
        rowNode.setSelected(false)
        return true
    }

    getAllRowsData<T = any>(): T[] {
        const rows: T[] = []
        this.api.forEachNode(node => rows.push(node.data))
        return rows
    }


    cleanErrorMaterialInventory(
        currentPackCode: string,
        inputSlot: string,
        inputSubSlot: string | null
    ) {
        if (!currentPackCode) return
        this.api.forEachNode((node) => {
            const isSame = node.data.materialInventoryIdno === currentPackCode

            const nodeSubSlot = node.data.subSlotIdno ?? ""
            const targetSubSlot = inputSubSlot ?? ""
            const isDifferentSlot =
                node.data.slotIdno !== inputSlot || nodeSubSlot !== targetSubSlot

            const isCorrect = node.data.correct === "true"

            if (isSame && isDifferentSlot && !isCorrect) {
                node.setDataValue("materialInventoryIdno", "")
                node.setDataValue("correct", "")
                node.setDataValue("remark", "")
                node.setDataValue("firstAppendTime", null)
                node.setDataValue("operatorIdno", "")
            }
        })
    }

    markMismatch(
        inputSlot: string,
        inputSubSlot: string | null,
        materialIdno: string
    ) {
        const inputSlotIdno = `${inputSlot}-${inputSubSlot ?? ""}`
        const existingNode = this.getRowNodeById(inputSlotIdno)

        if (existingNode) {
            existingNode.setDataValue("correct", "false")
            existingNode.setDataValue("materialInventoryIdno", materialIdno)
        }
    }

    checkAllCorrect(): { allCorrect: boolean; invalidSlots: string[] } {
        let allCorrect = true
        const invalidSlots: string[] = []
        this.api.forEachNode((node) => {
            if (node.data.correct !== "true") {
                allCorrect = false
                invalidSlots.push(
                    `${node.data.slotIdno}-${node.data.subSlotIdno ?? ""}`
                )
            }
        })
        return { allCorrect, invalidSlots }
    }
}
