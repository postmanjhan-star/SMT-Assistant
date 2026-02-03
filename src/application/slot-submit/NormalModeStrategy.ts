import { SlotSubmitContext } from "./SlotSubmitContext";
import { SlotSubmitStrategy } from "./SlotSubmitStrategy";
import { SlotSubmitDeps } from "./SlotSubmitDeps";

const MODE_NAME_NORMAL = '✅ 正式生產模式'

export class NormalModeStrategy implements SlotSubmitStrategy {
    constructor(private deps: SlotSubmitDeps) {}

    async submit(ctx: SlotSubmitContext): Promise<boolean> {
        const { grid, ui, resetInputs, autoUpload, isTestingMode } = this.deps
        const { result, slot, subSlot, slotIdno } = ctx

        if (!result) { await ui.warn('請先掃描物料條碼'); return false; }

        const matchedRows = result.matchedRows || []
        if (matchedRows.length === 0) { await ui.warn('此物料未匹配任何槽位'); return false; }

        // Find if the scanned slot matches ANY of the valid slots for this material.
        // This allows scanning 10008-L or 10008-R if both are valid for the scanned material.
        const targetRow = matchedRows.find(row => row.slotIdno === slot && (row.subSlotIdno ?? '') === (subSlot ?? ''));
        const isCorrectSlot = !!targetRow;

        if (isCorrectSlot) {
            const correctTargetRow = matchedRows[0];
            const correctSlotIdno = `${targetRow.slotIdno}-${targetRow.subSlotIdno ?? ''}`;
            const rowNode = grid.api.getRowNode(correctSlotIdno);

            if (!rowNode) { await ui.error(`找不到物料槽位 ${correctSlotIdno}`); return false; }

            grid.cleanErrorMaterialInventory(result.materialInventory?.idno, slot, subSlot)

            rowNode.setDataValue('materialInventoryIdno', result.materialInventory?.idno ?? '')
            rowNode.setDataValue('remark', result.materialInventory?.remark ?? '')
            rowNode.setDataValue('correct', 'true')
            rowNode.setDataValue('firstAppendTime', new Date().toISOString())
            
            resetInputs()

            // 使用 setTimeout 確保 Grid 狀態完全更新後再檢查
            setTimeout(() => {
                const { allCorrect, invalidSlots } = grid.checkAllCorrect();

                if (!isTestingMode && allCorrect) {
                    // message.success('所有槽位匹配完成，自動觸發上傳...')
                    ui.success('所有槽位匹配完成，自動觸發上傳...');
                    const currentRows: any[] = []
                    grid.api.forEachNode(node => currentRows.push(node.data))
                    autoUpload(currentRows)
                } else if (!allCorrect) {
                    console.log('尚未滿足自動上傳條件，未完成槽位:', invalidSlots);
                }
            }, 300)

            await ui.success(`${MODE_NAME_NORMAL}：槽位 ${correctSlotIdno} 綁定成功`)
            return true
        } else {
            const correctTargetRow = matchedRows[0];
            const suggestedSlot = `${correctTargetRow.slotIdno}-${correctTargetRow.subSlotIdno ?? ''}`;
            const rowNode = grid.api.getRowNode(suggestedSlot)
            
            // handleMistmatch logic
            grid.markMismatch(slot, subSlot, result.materialInventory?.idno ?? '')
            
            rowNode?.setSelected(false)
            
            await ui.error(`錯誤的槽位 ${slotIdno}，此物料應放置於 ${suggestedSlot}`)
            resetInputs()
            return false
        }
    }
}