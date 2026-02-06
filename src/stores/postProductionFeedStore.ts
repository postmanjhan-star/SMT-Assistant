import { defineStore } from "pinia"
import { ref } from "vue"

export type PostProductionCorrectState = "true" | "false" | "warning"

export type PostProductionMaterialInventory = {
    idno: string
    remark?: string
}

export type PostProductionFeedUi = {
    success: (msg: string) => Promise<void> | Promise<boolean>
    warn: (msg: string) => boolean | void
    info?: (msg: string) => void
    error: (msg: string) => Promise<void> | Promise<boolean>
    notifyError: (msg: string) => void
    playErrorTone: () => Promise<void>
    resetSlotMaterialFormInputs: () => void
}

export type PostProductionMaterialResult = {
    success: boolean
    materialInventory?: PostProductionMaterialInventory | null
    matchedRows?: Array<{
        slotIdno: string
        subSlotIdno?: string | null
    }>
}

export type PostProductionGridPort = {
    getRowNode: (rowId: string) => any
    getRow: (slot: string, subSlot: string) => any | undefined
    getRowId: (row: { slotIdno: string; subSlotIdno?: string | null }) => string
    deselectRow: (rowId: string) => boolean
    cleanErrorMaterialInventory: (
        currentPackCode: string,
        inputSlot: string,
        inputSubSlot: string
    ) => void
    applyInspectionUpdate: (row: any, materialPackIdno: string) => void
    setAppendedMaterialInventoryIdno: (
        rowId: string,
        appendedIdno: string
    ) => boolean
}

export const usePostProductionFeedStore = defineStore(
    "postProductionFeed",
    () => {
        const correctState = ref<PostProductionCorrectState>("false")
        const materialResult = ref<PostProductionMaterialResult | null>(null)
        const showRollShortageModal = ref(false)
        const rollShortageFormValue = ref({
            materialInventoryIdno: "",
            slotIdno: "",
            type: "",
        })

        let grid: PostProductionGridPort | null = null
        let ui: PostProductionFeedUi | null = null

        function bindGrid(port: PostProductionGridPort) {
            grid = port
        }

        function bindUi(handlers: PostProductionFeedUi) {
            ui = handlers
        }

        function setMaterialResult(
            result: PostProductionMaterialResult | null
        ) {
            materialResult.value = result
        }

        function clearMaterialResult() {
            materialResult.value = null
        }

        function setCorrectState(state: PostProductionCorrectState) {
            correctState.value = state
        }

        function getCorrectState() {
            return correctState.value
        }

        async function success(msg: string): Promise<void> {
            await ui?.success?.(msg)
        }

        function warn(msg: string): boolean {
            const result = ui?.warn?.(msg)
            return typeof result === "boolean" ? result : false
        }

        function info(msg: string) {
            ui?.info?.(msg)
        }

        async function error(msg: string): Promise<void> {
            await ui?.error?.(msg)
        }

        function notifyError(msg: string) {
            ui?.notifyError?.(msg)
        }

        async function playErrorTone(): Promise<void> {
            await ui?.playErrorTone?.()
        }

        function resetSlotMaterialFormInputs() {
            ui?.resetSlotMaterialFormInputs?.()
        }

        function openRollShortageModal() {
            showRollShortageModal.value = true
        }

        function closeRollShortageModal() {
            showRollShortageModal.value = false
        }

        function resetRollShortageForm() {
            rollShortageFormValue.value = {
                materialInventoryIdno: "",
                slotIdno: "",
                type: "",
            }
        }

        function getRowNode(rowId: string) {
            return grid?.getRowNode(rowId)
        }

        function getRow(slot: string, subSlot: string) {
            return grid?.getRow(slot, subSlot)
        }

        function getRowId(row: { slotIdno: string; subSlotIdno?: string | null }) {
            return grid?.getRowId(row) ?? ""
        }

        function deselectRow(rowId: string): boolean {
            return grid?.deselectRow(rowId) ?? false
        }

        function cleanErrorMaterialInventory(
            currentPackCode: string,
            inputSlot: string,
            inputSubSlot: string
        ) {
            grid?.cleanErrorMaterialInventory(
                currentPackCode,
                inputSlot,
                inputSubSlot
            )
        }

        function applyInspectionUpdate(row: any, materialPackIdno: string) {
            grid?.applyInspectionUpdate(row, materialPackIdno)
        }

        function setAppendedMaterialInventoryIdno(
            rowId: string,
            appendedIdno: string
        ): boolean {
            return grid?.setAppendedMaterialInventoryIdno(rowId, appendedIdno) ?? false
        }

        return {
            correctState,
            materialResult,
            bindGrid,
            bindUi,
            setMaterialResult,
            clearMaterialResult,
            setCorrectState,
            getCorrectState,
            showRollShortageModal,
            rollShortageFormValue,
            success,
            warn,
            info,
            error,
            notifyError,
            playErrorTone,
            resetSlotMaterialFormInputs,
            openRollShortageModal,
            closeRollShortageModal,
            resetRollShortageForm,
            getRowNode,
            getRow,
            getRowId,
            deselectRow,
            cleanErrorMaterialInventory,
            applyInspectionUpdate,
            setAppendedMaterialInventoryIdno,
        }
    }
)

export type PostProductionFeedStore = ReturnType<typeof usePostProductionFeedStore>
