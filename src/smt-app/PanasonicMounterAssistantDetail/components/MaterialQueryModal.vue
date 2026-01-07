<script setup lang="ts">
import { ref, watch } from 'vue'
import { NModal, NButton, useMessage } from 'naive-ui'
import { AgGridVue } from 'ag-grid-vue3'
import type { GridOptions, RowNode, GetRowIdParams } from 'ag-grid-community'
import { SmtService } from '@/client'

const props = defineProps<{
    uuid: string
    show: boolean
}>()

const emit = defineEmits<{
    (e: 'update:show', value: boolean): void
    (e: 'error', msg: string): void
}>()

const message = useMessage()

// 資料
type MaterialQueryRowModel = {
    correct: string
    slotIdno: string
    subSlotIdno: string
    materialInventoryIdno: string
    materialInventoryType: string
    checktime: string
    operatorName: string
    remark?: string
}
const rowData = ref<MaterialQueryRowModel[]>([])

// Grid Options
const gridOptions: GridOptions = {
    columnDefs: [
        { field: "correct", headerName: "", flex: 1 },
        { field: "slotIdno", headerName: '槽位', flex: 3 },
        { field: "subSlotIdno", headerName: '子槽位', flex: 2 },
        { field: "materialInventoryIdno", headerName: '接料代碼', flex: 5 },
        { field: "materialInventoryType", headerName: '物料類型', flex: 5 },
        { field: "checktime", headerName: '接料時間', flex: 5 },
        { field: "operatorName", headerName: '操作人員', flex: 5 },
        { field: "remark", headerName: '備註', flex: 5 },
    ],
    defaultColDef: { editable: false, filter: true, sortable: true, resizable: true },
    rowSelection: 'multiple',
    getRowId: (params: GetRowIdParams) => String(params.data.id)
}


async function fetchLogs() {
    if (!props.uuid) return 

    try {
        const logs = await SmtService.getTheStatsOfLogsByUuid({ uuid: props.uuid })
        const newRowData: MaterialQueryRowModel[] = []
        for (const log of logs) {
            newRowData.push({
                correct: log.check_pack_code_match,
                slotIdno: log.slot_idno,
                subSlotIdno: log.sub_slot_idno,
                materialInventoryIdno: log.material_pack_code,
                materialInventoryType: log.feed_material_pack_type,
                operatorName: log.operator_id ?? '',
                checktime: log.created_at,
                remark: log.check_pack_code_match === 'TESTING_MATERIAL_PACK' ? '廠商測試料' : ''
            })
        }
        rowData.value = newRowData
    } catch (e) {
        console.error(e)
        emit('error', `找不到接料資訊 ${props.uuid}`)
    }
}

watch(
    () => props.show,
    async (val) => {
        if (val) {
            await fetchLogs()
        }
    },
    { immediate: true }
)

</script>

<template>
    <n-modal v-model:show="props.show" preset="dialog" title="查詢物料" :style="{ width: '90vw', maxWidth: '1400px' }">
        <div style="height: 350px; padding: 1rem;">
            <ag-grid-vue class="ag-theme-balham-dark" :rowData="rowData" :gridOptions="gridOptions"
                style="height: 100%;"></ag-grid-vue>
        </div>
        <template #action>
            <n-button type="primary" @click="$emit('update:show', false)">確定</n-button>
        </template>
    </n-modal>
</template>
