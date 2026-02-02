import { GridApi } from "ag-grid-community";

export interface UiFeedback {
    success(msg: string): Promise<void>
    warn(msg: string): Promise<void>
    error(msg: string): Promise<void>
}

export class MaterialGrid {
    constructor(public api: GridApi) {}

    cleanErrorMaterialInventory(currentPackCode: string, inputSlot: string, inputSubSlot: string) {
        if (!currentPackCode) return
        this.api.forEachNode((node) => {
            const isSame = node.data.materialInventoryIdno === currentPackCode
            const isDifferentSlot = `${node.data.slotIdno}-${node.data.subSlotIdno}` !== `${inputSlot}-${inputSubSlot}`
            const isCorrect = node.data.correct === 'true'

            if (isSame && isDifferentSlot && !isCorrect) {
                node.setDataValue('materialInventoryIdno', '')
                node.setDataValue('correct', '')
                node.setDataValue('remark', '')
                node.setDataValue('firstAppendTime', null)
            }
        })
    }
}

export type SlotSubmitDeps = {
    grid: MaterialGrid
    ui: UiFeedback
    isTestingMode: boolean
    autoUpload: (rows: any[]) => void
    resetInputs: () => void
}