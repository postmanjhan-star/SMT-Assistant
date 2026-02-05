import { RowModelBase } from "@/application/post-production-feed/PostProductionFeedTypes"

type GridApiLike = {
    getRowNode: (rowId: string) => any
    forEachNode: (callback: (node: any) => void) => void
    applyTransaction: (params: { update: any[] }) => void
}

type GridApiGetter = () => GridApiLike | null | undefined

export class PostProductionFeedGridAdapter<TRow extends RowModelBase> {
    private getApi: GridApiGetter

    constructor(
        apiOrGetter: GridApiLike | GridApiGetter,
        private getRowData: () => TRow[]
    ) {
        this.getApi =
            typeof apiOrGetter === "function"
                ? (apiOrGetter as GridApiGetter)
                : () => apiOrGetter
    }

    getRow(slot: string, subSlot: string): TRow | undefined {
        return this.getRowData().find(
            r => r.slotIdno === slot && (r.subSlotIdno ?? "") === subSlot
        )
    }

    getRowId(row: Pick<RowModelBase, "slotIdno" | "subSlotIdno">): string {
        return `${row.slotIdno}-${row.subSlotIdno ?? ""}`
    }

    getRowNode(rowId: string) {
        const api = this.getApi()
        if (!api) return undefined
        return api.getRowNode(rowId)
    }

    deselectRow(rowId: string): boolean {
        const api = this.getApi()
        if (!api) return false
        const rowNode = api.getRowNode(rowId)
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
        const api = this.getApi()
        if (!api) return
        api.forEachNode((node) => {
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
        const api = this.getApi()
        if (!api) return
        row.inspectMaterialPackCode = materialPackIdno
        row.inspectTime = new Date().toISOString()
        row.inspectCount = (row.inspectCount ?? 0) + 1
        row.remark = `巡檢 ${row.inspectCount} 次`

        api.applyTransaction({
            update: [row],
        })
    }

    setAppendedMaterialInventoryIdno(rowId: string, appendedIdno: string): boolean {
        const api = this.getApi()
        if (!api) return false
        const rowNode = api.getRowNode(rowId)
        if (!rowNode) return false

        rowNode.setDataValue("appendedMaterialInventoryIdno", appendedIdno)
        return true
    }
}
