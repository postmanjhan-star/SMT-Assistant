import { SlotSubmitContext } from "./SlotSubmitContext";
import { SlotSubmitStrategy } from "./SlotSubmitStrategy";
import { SlotSubmitDeps } from "./SlotSubmitDeps";
import { decideSlotBinding, shouldAutoUpload } from "@/domain/slot/SlotBindingRules";

const MODE_NAME_NORMAL = '✅ 正式生產模式'

export class NormalModeStrategy implements SlotSubmitStrategy {
    constructor(private deps: SlotSubmitDeps) {}

    async submit(ctx: SlotSubmitContext): Promise<boolean> {
        const { grid, ui, resetInputs, autoUpload, isTestingMode } = this.deps
        const { result, slot, subSlot, slotIdno } = ctx

        if (!result) { await ui.warn('請先掃描物料條碼'); return false; }

        const matchedRows = result.matchedRows || []
        const bindingDecision = decideSlotBinding(
            { slotIdno: slot, subSlotIdno: subSlot },
            matchedRows
        )

        if (bindingDecision.kind === 'no_allowed_slots') {
            await ui.warn('此物料未匹配任何槽位')
            return false
        }

        if (bindingDecision.kind === 'match') {
            const correctSlotIdno = bindingDecision.matchedSlotIdno

            if (!grid.hasRow(correctSlotIdno)) { await ui.error(`槽位不存在 ${correctSlotIdno}`); return false; }

            grid.cleanErrorMaterialInventory(result.materialInventory?.idno, slot, subSlot)

            grid.applyBindingSuccess(
                correctSlotIdno,
                result.materialInventory?.idno ?? '',
                result.materialInventory?.remark ?? ''
            )
            
            resetInputs()

            // 使用 setTimeout 確保 Grid 狀態完全更新後再檢查
            setTimeout(() => {
                const { allCorrect, invalidSlots } = grid.checkAllCorrect();

                if (shouldAutoUpload({ allCorrect, isTestingMode })) {
                    // message.success('所有槽位匹配完成，自動觸發上傳...')
                    ui.success('所有槽位匹配完成，自動觸發上傳...');
                    autoUpload(grid.getAllRowsData())
                } else if (!allCorrect) {
                    console.log('尚未滿足自動上傳條件，未完成槽位:', invalidSlots);
                }
            }, 300)

            await ui.success(`${MODE_NAME_NORMAL}：槽位 ${correctSlotIdno} 綁定成功`)
            return true
        } else {
            const suggestedSlot = bindingDecision.suggestedSlotIdno
            
            // handleMistmatch logic
            grid.markMismatch(slot, subSlot, result.materialInventory?.idno ?? '')
            
            grid.deselectRow(suggestedSlot)
            
            await ui.error(`錯誤的槽位 ${bindingDecision.inputSlotIdno}，此物料應放置於 ${suggestedSlot}`)
            resetInputs()
            return false
        }
    }
}
