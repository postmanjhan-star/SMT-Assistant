import { SlotSubmitContext } from "./SlotSubmitContext";
import { SlotSubmitStrategy } from "./SlotSubmitStrategy";
import { SlotSubmitDeps } from "./SlotSubmitDeps";
import { decideTestingSlotBinding, formatSlotIdno } from "@/domain/slot/SlotBindingRules";

const MODE_NAME_TESTING = '🧪 試產生產模式'

export class TestingModeStrategy implements SlotSubmitStrategy {
    constructor(private deps: SlotSubmitDeps) {}

    async submit(ctx: SlotSubmitContext): Promise<boolean> {
        const { grid, ui, resetInputs } = this.deps
        const { result, slot, subSlot, slotIdno } = ctx

        if (!result) { await ui.warn('請先掃描物料條碼'); return false; }

        const matchedRows = result.matchedRows || []
        const inputSlotIdno = formatSlotIdno({ slotIdno: slot, subSlotIdno: subSlot })
        const rowNode = grid.api.getRowNode(inputSlotIdno)

        if (!rowNode) { await ui.error(`找不到的輸入槽位 ${slotIdno}`); return false; }

        const bindingDecision = decideTestingSlotBinding(
            { slotIdno: slot, subSlotIdno: subSlot },
            matchedRows
        )

        if (bindingDecision.kind === 'match') {
            const materialRowNode = grid.api.getRowNode(bindingDecision.matchedSlotIdno)

            if (!materialRowNode) { await ui.error(`找不到物料槽位 ${slotIdno}`); return false; }

            grid.cleanErrorMaterialInventory(result.materialInventory?.idno, slot, subSlot)

            rowNode.setDataValue('materialInventoryIdno', result.materialInventory?.idno ?? '')
            rowNode.setDataValue('remark', result.materialInventory?.remark ?? '')
            rowNode.setDataValue('correct', 'true')
            rowNode.setDataValue('firstAppendTime', new Date().toISOString())

            resetInputs()
            await ui.success(`${MODE_NAME_TESTING}：槽位 ${slotIdno} 綁定成功`)
            return true
        }

        // 試產模式下的強制綁定邏輯
        const testRemark = bindingDecision.remark
        rowNode.setDataValue('correct', 'warning')
        rowNode.setDataValue('remark', testRemark)
        rowNode.setDataValue('materialInventoryIdno', result.materialInventory?.idno ?? '')
        rowNode.setDataValue('firstAppendTime', new Date().toISOString())

        await ui.success(`${MODE_NAME_TESTING}：槽位 ${slotIdno} 已標記為 ${testRemark}`)
        resetInputs()
        return true
    }
}
