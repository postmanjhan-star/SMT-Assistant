import { GridApi } from "ag-grid-community"
import { RowModelBase } from "@/application/post-production-feed/PostProductionFeedTypes"

export class PostProductionFeedGridAdapter<TRow extends RowModelBase> {
    constructor(
        private api: GridApi,
        private getRowData: () => TRow[]
    ) {}

    getRow(slot: string, subSlot: string): TRow | undefined {
        return this.getRowData().find(
            r => r.slotIdno === slot && (r.subSlotIdno ?? "") === subSlot
        )
    }

    getRowId(row: Pick<RowModelBase, "slotIdno" | "subSlotIdno">): string {
        return `${row.slotIdno}-${row.subSlotIdno ?? ""}`
    }

    getRowNode(rowId: string) {
        return this.api.getRowNode(rowId)
    }

    deselectRow(rowId: string): boolean {
        const rowNode = this.api.getRowNode(rowId)
        if (!rowNode) return false
        rowNode.setSelected(false)
        return true
    }

    cleanErrorMaterialInventory(
        currentPackCode: string,
        inputSlot: string,
        inputSubSlot: string
    ) {
        if (!currentPackCode) return
        this.api.forEachNode((node) => {
            const isSame = node.data.materialInventoryIdno === currentPackCode
            const isDifferentSlot =
                `${node.data.slotIdno}-${node.data.subSlotIdno}` !==
                `${inputSlot}-${inputSubSlot}`
            const isCorrect = node.data.correct === "true"

            if (isSame && isDifferentSlot && !isCorrect) {
                node.setDataValue("materialInventoryIdno", "")
                node.setDataValue("correct", "")
                node.setDataValue("remark", "")
                node.setDataValue("firstAppendTime", null)
            }
        })
    }

    applyInspectionUpdate(row: TRow, materialPackIdno: string) {
        row.inspectMaterialPackCode = materialPackIdno
        row.inspectTime = new Date().toISOString()
        row.inspectCount = (row.inspectCount ?? 0) + 1
        row.remark = `巡檢 ${row.inspectCount} 次`

        this.api.applyTransaction({
            update: [row],
        })
    }

    setAppendedMaterialInventoryIdno(rowId: string, appendedIdno: string): boolean {
        const rowNode = this.api.getRowNode(rowId)
        if (!rowNode) return false

        rowNode.setDataValue("appendedMaterialInventoryIdno", appendedIdno)
        return true
    }
}
