<script setup lang="ts">
import { ref, watch, computed } from 'vue'
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

const showModel = computed({
    get: () => props.show,
    set: (val: boolean) => emit('update:show', val)
})

const message = useMessage()

// 資料
type MaterialQueryRowModel = {
    id: number
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
        { field: "correct", tooltipField: "correct", headerName: "", flex: 1, minWidth: 60, refData: { 'MATCHED_MATERIAL_PACK': '✅', 'UNMATCHED_MATERIAL_PACK': '❌', 'TESTING_MATERIAL_PACK': '⚠️', 'UNCHECKED_MATERIAL_PACK': '' } },
        { field: "slotIdno", tooltipField: 'slotIdno', headerName: '槽位', flex: 3, minWidth: 90 },
        { field: "subSlotIdno", tooltipField: 'subSlotIdno', headerName: 'Stage', flex: 2, minWidth: 100 }, // Fuji 專用：顯示為 Stage
        { field: "materialInventoryIdno", tooltipField: 'materialInventoryIdno', headerName: '接料代碼', flex: 5, minWidth: 140 },
        { field: "materialInventoryType", tooltipField: "materialInventoryType", headerName: '物料類型', flex: 5, minWidth: 140, refData: { 'NEW_MATERIAL_PACK': '新接物料', 'REUSED_MATERIAL_PACK': '舊物料', 'IMPORTED_MATERIAL_PACK': '未標註' } },
        { field: "checktime", tooltipField: "checktime", headerName: '接料時間', flex: 5, minWidth: 140 },
        { field: "operatorName", tooltipField: "operatorName", headerName: '操作人員', flex: 5, minWidth: 140 },
        { field: "remark", tooltipField: "remark", headerName: '備註', flex: 5, minWidth: 140 },
    ],
    defaultColDef: { editable: false, filter: true, sortable: true, resizable: true },
    rowSelection: 'multiple',
    getRowId: (params: GetRowIdParams) => String(params.data.id)
}

async function fetchLogs() {
    if (!props.uuid) return

    try {
        const logs = await SmtService.getTheFujiStatsOfLogsByUuid({ uuid: props.uuid })
        const newRowData: MaterialQueryRowModel[] = []
        for (const log of logs) {
            newRowData.push({
                id: log.id,
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
    () => showModel.value,
    (val) => {
        if (val) {
            fetchLogs()
        }
    },
    { immediate: true }
)
</script>

<template>
    <n-modal v-model:show="showModel" preset="dialog" title="查詢物料 (Fuji)" :style="{ width: '90vw', maxWidth: '1400px' }">
        <div style="height: 350px; padding: 1rem;">
            <ag-grid-vue class="ag-theme-balham-dark" :rowData="rowData" :gridOptions="gridOptions"
                style="height: 100%;"></ag-grid-vue>
        </div>
        <template #action>
            <n-button type="primary" @click="$emit('update:show', false)">確定</n-button>
        </template>
    </n-modal>
</template>