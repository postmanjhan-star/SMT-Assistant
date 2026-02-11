import { GridApi } from "ag-grid-community"

export class SlotSubmitFeedGridAdapter {
    constructor(private api: GridApi) {}

    hasRow(rowId: string): boolean {
        return !!this.api.getRowNode(rowId)
    }

    applyBindingSuccess(
        rowId: string,
        materialInventoryIdno?: string,
        remark?: string
    ): boolean {
        const rowNode = this.api.getRowNode(rowId)
        if (!rowNode) return false

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
        const rowNode = this.api.getRowNode(rowId)
        if (!rowNode) return false

        rowNode.setDataValue('correct', 'warning')
        rowNode.setDataValue('remark', remark)
        rowNode.setDataValue('materialInventoryIdno', materialInventoryIdno ?? '')
        rowNode.setDataValue('firstAppendTime', new Date().toISOString())
        return true
    }

    deselectRow(rowId: string): boolean {
        const rowNode = this.api.getRowNode(rowId)
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
            }
        })
    }

    markMismatch(
        inputSlot: string,
        inputSubSlot: string | null,
        materialIdno: string
    ) {
        const inputSlotIdno = `${inputSlot}-${inputSubSlot}`
        const existingNode = this.api.getRowNode(inputSlotIdno)

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
