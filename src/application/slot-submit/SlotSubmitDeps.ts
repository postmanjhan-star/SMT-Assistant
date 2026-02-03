import { GridApi } from "ag-grid-community";

export interface UiFeedback {
    success(msg: string): Promise<void>
    warn(msg: string): Promise<void>
    error(msg: string): Promise<void>
}

export class MaterialGrid {
    constructor(public api: GridApi) {}

    cleanErrorMaterialInventory(currentPackCode: string, inputSlot: string, inputSubSlot: string | null) {
        if (!currentPackCode) return
        this.api.forEachNode((node) => {
            const isSame = node.data.materialInventoryIdno === currentPackCode
            
            const nodeSubSlot = node.data.subSlotIdno ?? ''
            const targetSubSlot = inputSubSlot ?? ''
            const isDifferentSlot = node.data.slotIdno !== inputSlot || nodeSubSlot !== targetSubSlot
            
            const isCorrect = node.data.correct === 'true'

            if (isSame && isDifferentSlot && !isCorrect) {
                node.setDataValue('materialInventoryIdno', '')
                node.setDataValue('correct', '')
                node.setDataValue('remark', '')
                node.setDataValue('firstAppendTime', null)
            }
        })
    }

    markMismatch(inputSlot: string, inputSubSlot: string | null, materialIdno: string) {
        const inputSlotIdno = `${inputSlot}-${inputSubSlot}`
        const existingNode = this.api.getRowNode(inputSlotIdno)

        if (existingNode) {
            existingNode.setDataValue('correct', 'false')
            existingNode.setDataValue('materialInventoryIdno', materialIdno)
        }
    }

    checkAllCorrect(): { allCorrect: boolean, invalidSlots: string[] } {
        let allCorrect = true;
        const invalidSlots: string[] = [];
        this.api.forEachNode((node) => {
            if (node.data.correct !== 'true') {
                allCorrect = false;
                invalidSlots.push(`${node.data.slotIdno}-${node.data.subSlotIdno ?? ''}`);
            }
        });
        return { allCorrect, invalidSlots };
    }
}

export type SlotSubmitDeps = {
    grid: MaterialGrid
    ui: UiFeedback
    isTestingMode: boolean
    autoUpload: (rows: any[]) => void
    resetInputs: () => void
}