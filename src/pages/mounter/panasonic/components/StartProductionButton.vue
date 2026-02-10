<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDialog } from 'naive-ui'
import {
    ApiError,
    CheckMaterialMatchEnum,
    PanasonicMounterItemStatCreate,
    PanasonicFeedRecordCreate,
    PanasonicItemStatFeedLogRead,
    ProduceTypeEnum,
    BoardSideEnum,
    MachineSideEnum,
    FeedMaterialTypeEnum,
    SmtMaterialInventory
} from '@/client';
import { startPanasonicProduction } from '@/application/panasonic/production/StartPanasonicProduction'

type CorrectState = 'true' | 'false' | 'warning'

type RowModel = {
    correct: CorrectState | null,
    id: number,
    slotIdno: string,
    subSlotIdno: string,
    materialIdno: string,
    materialInventoryIdno: string,
    appendedMaterialInventoryIdno: string,
    remark?: string,
    firstAppendTime?: string | null,
}

const props = defineProps({
    rowData: Array<RowModel>,
    isTestingMode: Boolean,
    operator_id: String,
    workOrderIdno: String,
    productIdno: String,
    mounterIdno: String,
    machineSideQuery: String,
    workSheetSideQuery: String
})

const emit = defineEmits(['started', 'error'])


const productionStatUuid = ref()
const machineSide = ref<MachineSideEnum>()
const statMap = new Map<string, any>()
const dialog = useDialog()
const loading = ref(false)

function makeSlotKey(slot: string, subSlot?: string | null) {
    if (subSlot && subSlot.trim() !== '') {
        return `${slot}-${subSlot.trim()}`
    }
    return slot
}



function convertMatch(s: CorrectState | null): CheckMaterialMatchEnum | null {
    return s as unknown as CheckMaterialMatchEnum
}

function convertProduceMode(s: boolean | null): ProduceTypeEnum | null {
    return s as unknown as ProduceTypeEnum
}

function convertBoardSide(s: String | null): BoardSideEnum | null {
    return s as unknown as BoardSideEnum
}

function onProduction() {
    const invalid = props.rowData.filter(r => {
        if (r.correct === 'false') return true
        if (!props.isTestingMode && r.correct == null) return true
        return false
    })

    if (invalid.length > 0) {
        emit('error', props.isTestingMode
            ? '尚有槽位不匹配，不能開始生產'
            : '尚有槽位未確認或不匹配，不能開始生產')
        return
    }

    dialog.warning({
        title: '開始生產確認',
        content: '確定要開始生產嗎？',
        positiveText: '確定',
        negativeText: '取消',
        onPositiveClick: () => startProductionUpload(),
        onNegativeClick: () => { }
    })
}

async function startProductionUpload(rows?: RowModel[]) {
    if (loading.value) return
    loading.value = true
    try {
        // 判斷 boardSide / machineSide
        const boardSide = convertBoardSide(props.workSheetSideQuery)

        machineSide.value =
            props.machineSideQuery === '1'
                ? MachineSideEnum.FRONT
                : props.machineSideQuery === '2'
                    ? MachineSideEnum.BACK
                    : null

        console.log(machineSide.value)

        const dataToUse = rows || props.rowData

        const payload = dataToUse.map(row => ({
            operator_id: props.operator_id ?? null,
            operation_time: row.firstAppendTime 
                ? new Date(row.firstAppendTime).toISOString()
                : new Date().toISOString(),
            production_start: new Date().toISOString(),
            work_order_no: props.workOrderIdno,
            product_idno: props.productIdno,
            machine_idno: props.mounterIdno,
            machine_side: machineSide.value,
            board_side: boardSide,
            slot_idno: row.slotIdno,
            sub_slot_idno: row.subSlotIdno ?? null,
            material_idno: row.materialIdno ?? null,
            material_pack_code: row.materialInventoryIdno ?? null,
            produce_mode: convertProduceMode(props.isTestingMode ?? false),
            check_pack_code_match: convertMatch(row.correct)
        }))

        const response = await startPanasonicProduction(payload)
        productionStatUuid.value = response[0].uuid

        response.forEach(stat => {
            const key = makeSlotKey(stat.slot_idno, stat.sub_slot_idno)
            statMap.set(key, stat)
        })

        emit('started', productionStatUuid.value)

    } catch (err) {
        emit('error', '資料上傳失敗')
    } finally {
        loading.value = false
    }
}

defineExpose({
    submit: startProductionUpload
})

</script>

<template>
    <n-button type="success" size="small" @click="onProduction" :loading="loading" :disabled="loading">
        🚀 開始生產
    </n-button>
</template>
