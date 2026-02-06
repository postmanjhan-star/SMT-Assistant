import { ref } from "vue"
import type { FormInst } from "naive-ui"
import { ApiError, type PanasonicMounterItemStatRead } from "@/client"
import {
    fetchMaterialInventoryForSmt,
    uploadAppendRecord,
} from "@/application/post-production-feed/PostProductionFeedRecordUseCase"
import { MODE_NAME_TESTING } from "@/application/post-production-feed/PostProductionFeedConstants"
import {
    appendMaterialCode,
} from "@/domain/production/PostProductionFeedRules"
import { parseSlotIdno } from "@/domain/production/PostProductionFeedRecord"
import { usePostProductionFeedStore } from "@/stores/postProductionFeedStore"

export type RollShortageFormValue = {
    materialInventoryIdno: string
    slotIdno: string
    type: string
}

export type UsePostProductionRollShortageOptions<TRow extends {
    slotIdno: string
    subSlotIdno?: string | null
    materialIdno: string
    appendedMaterialInventoryIdno: string
}> = {
    getMounterData: () => PanasonicMounterItemStatRead[]
    getRowData: () => TRow[]
    isTestingMode: () => boolean
    getOperatorId?: () => string | null
}

export function usePostProductionRollShortage<
    TRow extends {
        slotIdno: string
        subSlotIdno?: string | null
        materialIdno: string
        appendedMaterialInventoryIdno: string
    }
>(options: UsePostProductionRollShortageOptions<TRow>) {
    const store = usePostProductionFeedStore()
    const rollShortageFormRef = ref<FormInst | null>(null)

    const showRollShortageModal = store.showRollShortageModal
    const rollShortageFormValue = store.rollShortageFormValue

    const onRollShortage = () => {
        store.openRollShortageModal()
    }

    const getMaterialMatchedRows = (materialIdno: string): TRow[] => {
        return options.getRowData().filter(row => row.materialIdno === materialIdno)
    }

    const onSubmitShortage = async () => {
        const idno = rollShortageFormValue.value.materialInventoryIdno.trim()
        if (!idno) {
            await store.error("請輸入物料號")
            return
        }

        const inputSlotIdno = rollShortageFormValue.value.slotIdno.trim()
        if (!inputSlotIdno) {
            await store.error("請輸入槽位")
            return
        }

        const { slotIdno: inputSlot, subSlotIdno: inputSubSlot } =
            parseSlotIdno(inputSlotIdno)

        const stat = options.getMounterData().find(
            stat =>
                stat.slot_idno === inputSlot &&
                (stat.sub_slot_idno ?? "") === inputSubSlot
        )

        if (!stat) {
            await store.error("找不到對應的槽位的資料")
            return
        }

        const row = store.getRow(inputSlot, inputSubSlot)

        if (!row) {
            await store.error(`找不到表格槽位 ${inputSlotIdno}`)
            return
        }

        const rowId = store.getRowId(row)
        const rowNode = store.getRowNode(rowId)
        if (!rowNode) {
            await store.error(`找不到AG Grid 資料列 ${rowId}`)
            return
        }

        const packType = rollShortageFormValue.value.type
        if (!packType) {
            await store.error("請選擇物料類型")
            return
        }

        let correctState: "true" | "false" | "warning" | null = null

        try {
            await rollShortageFormRef.value?.validate()

            const materialInventory = await fetchMaterialInventoryForSmt(idno)

            const materialMatchRowArray = getMaterialMatchedRows(
                materialInventory.material_idno
            )

            if (materialMatchRowArray.length === 0) {
                await store.playErrorTone()
                await store.error("表格內無此物料")
                return
            }

            correctState = "true"
        } catch (error) {
            if (
                error instanceof ApiError &&
                error.status === 404 &&
                options.isTestingMode()
            ) {
                store.info(
                    `${MODE_NAME_TESTING}：使用物料 [廠商測試新料] ${idno}`
                )
                correctState = "warning"
            } else {
                if (error instanceof ApiError) {
                    const msg =
                        {
                            404: "查無此條碼",
                            504: "ERP 連線超時，請確認 ERP 連線",
                            502: "ERP 連線錯誤，請確認 ERP 連線",
                            500: "系統錯誤",
                        }[error.status] ?? "未知錯誤"

                    store.notifyError(msg)
                } else {
                    console.error(error)
                    store.notifyError("發生未知例外")
                }
                return
            }
        }

        await uploadAppendRecord({
            statId: stat.id,
            slotIdno: inputSlot,
            subSlotIdno: inputSubSlot,
            materialPackCode: idno,
            correctState,
            feedMaterialPackType: packType,
            operatorId: options.getOperatorId?.() ?? "",
        })

        await store.success("新增成功")

        const newAppendedIdno = appendMaterialCode(
            row.appendedMaterialInventoryIdno,
            idno
        )

        const updated = store.setAppendedMaterialInventoryIdno(
            rowId,
            newAppendedIdno
        )

        if (!updated) {
            await store.error(`找不到AG Grid 資料列 ${rowId}`)
            return
        }

        store.closeRollShortageModal()
        store.resetRollShortageForm()
    }

    return {
        rollShortageFormRef,
        rollShortageFormValue,
        showRollShortageModal,
        onRollShortage,
        onSubmitShortage,
        getMaterialMatchedRows,
    }
}
