import { defineStore } from 'pinia'
import { ref } from 'vue'
import { shouldAutoUpload } from '@/domain/slot/SlotBindingRules'
import type { SlotSubmitFeedGridAdapter } from '@/ui/shared/grid/slot-submit/SlotSubmitFeedGridAdapter'

export type SlotSubmitMode = 'normal' | 'testing'

export type SlotSubmitLastResult = {
    type: 'success' | 'warn' | 'error'
    message: string
}

type SlotSubmitDeps = {
    grid: SlotSubmitFeedGridAdapter
    resetInputs: () => void
}

type SlotSubmitInputSlot = {
    slot: string
    subSlot: string | null
}

const AUTO_UPLOAD_MESSAGE = '所有槽位匹配完成，自動觸發上傳...'

export const useSlotSubmitStore = defineStore('slotSubmit', () => {
    const mode = ref<SlotSubmitMode>('normal')
    const isTestingMode = ref(false)
    const lastResult = ref<SlotSubmitLastResult | null>(null)
    const pendingAutoUpload = ref<any[] | null>(null)

    let grid: SlotSubmitFeedGridAdapter | null = null
    let resetInputsCallback: (() => void) | null = null

    function bindDeps(deps: SlotSubmitDeps) {
        grid = deps.grid
        resetInputsCallback = deps.resetInputs
    }

    function setMode(next: SlotSubmitMode) {
        mode.value = next
        isTestingMode.value = next === 'testing'
    }

    function setTestingMode(value: boolean) {
        isTestingMode.value = value
        mode.value = value ? 'testing' : 'normal'
    }

    function setLastResult(result: SlotSubmitLastResult | null) {
        lastResult.value = result
    }

    function clearLastResult() {
        lastResult.value = null
    }

    function hasRow(rowId: string): boolean {
        if (!grid) return false
        return grid.hasRow(rowId)
    }

    function applyMatch(
        correctSlotIdno: string,
        materialInfo?: { idno?: string; remark?: string } | null,
        inputSlot?: string,
        inputSubSlot?: string | null
    ): boolean {
        if (!grid) return false
        if (!grid.hasRow(correctSlotIdno)) return false

        if (inputSlot != null) {
            grid.cleanErrorMaterialInventory(
                materialInfo?.idno ?? '',
                inputSlot,
                inputSubSlot ?? null
            )
        }

        grid.applyBindingSuccess(
            correctSlotIdno,
            materialInfo?.idno ?? '',
            materialInfo?.remark ?? ''
        )
        return true
    }

    function applyWarningBinding(
        slotIdno: string,
        materialInfo?: { idno?: string } | null,
        remark?: string
    ): boolean {
        if (!grid) return false
        return grid.applyWarningBinding(
            slotIdno,
            materialInfo?.idno ?? '',
            remark ?? ''
        )
    }

    function applyMismatch(
        inputSlot: SlotSubmitInputSlot,
        expectedSlotIdno: string,
        materialIdno?: string
    ) {
        if (!grid) return
        grid.markMismatch(inputSlot.slot, inputSlot.subSlot, materialIdno ?? '')
        grid.deselectRow(expectedSlotIdno)
    }

    function checkAutoUpload(): {
        allCorrect: boolean
        invalidSlots: string[]
        shouldAutoUpload: boolean
    } {
        if (!grid) {
            pendingAutoUpload.value = null
            return { allCorrect: false, invalidSlots: [], shouldAutoUpload: false }
        }

        const { allCorrect, invalidSlots } = grid.checkAllCorrect()
        const shouldUpload = shouldAutoUpload({
            allCorrect,
            isTestingMode: isTestingMode.value,
        })

        if (shouldUpload) {
            pendingAutoUpload.value = grid.getAllRowsData()
            lastResult.value = { type: 'success', message: AUTO_UPLOAD_MESSAGE }
        } else {
            pendingAutoUpload.value = null
            if (!allCorrect) {
                console.log('尚未滿足自動上傳條件，未完成槽位:', invalidSlots)
            }
        }

        return { allCorrect, invalidSlots, shouldAutoUpload: shouldUpload }
    }

    function clearPendingAutoUpload() {
        pendingAutoUpload.value = null
    }

    function resetInputs() {
        resetInputsCallback?.()
    }

    return {
        mode,
        isTestingMode,
        lastResult,
        pendingAutoUpload,
        bindDeps,
        setMode,
        setTestingMode,
        setLastResult,
        clearLastResult,
        hasRow,
        applyMatch,
        applyWarningBinding,
        applyMismatch,
        checkAutoUpload,
        clearPendingAutoUpload,
        resetInputs,
    }
})

export type SlotSubmitStore = ReturnType<typeof useSlotSubmitStore>
