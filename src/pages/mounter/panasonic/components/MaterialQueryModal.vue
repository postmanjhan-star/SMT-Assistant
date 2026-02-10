<script setup lang="ts">
import { watch, toRef } from 'vue'
import { NModal, NButton } from 'naive-ui'
import { AgGridVue } from 'ag-grid-vue3'
import type { GridOptions, GetRowIdParams } from 'ag-grid-community'
import { usePanasonicMaterialQuery } from '@/composables/panasonic/usePanasonicMaterialQuery'
import { useDateFormatter } from '@/composables/useDateFormatter'

const props = defineProps<{
    uuid: string
    show: boolean
}>()

const emit = defineEmits<{
    (e: 'update:show', value: boolean): void
    (e: 'error', msg: string): void
}>()

const { format } = useDateFormatter()

const uuidRef = toRef(props, 'uuid')
const show = toRef(props, 'show')
const { rowData, load } = usePanasonicMaterialQuery(uuidRef)

// Grid Options
const gridOptions: GridOptions = {
    columnDefs: [
        {
            field: "correct",
            headerName: "",
            flex: 1,
            refData: {
                MATCHED_MATERIAL_PACK: "✅",
                TESTING_MATERIAL_PACK: "⚠️",
                UNMATCHED_MATERIAL_PACK: "❌",
                UNCHECKED_MATERIAL_PACK: "",
            },
        },
        { field: "slotIdno", headerName: '槽位', flex: 3 },
        { field: "subSlotIdno", headerName: '子槽位', flex: 2 },
        { field: "materialInventoryIdno", headerName: '接料代碼', flex: 5 },
        {
            field: "materialInventoryType",
            headerName: '物料類型',
            flex: 5,
            refData: {
                NEW_MATERIAL_PACK: "新物料",
                REUSED_MATERIAL_PACK: "舊料",
                IMPORTED_MATERIAL_PACK: "未標註的物料",
                INSPECTION_MATERIAL_PACK: "巡檢物料",
            },
        },
        {
            field: "checktime",
            headerName: '接料時間',
            flex: 5,
            valueFormatter: (params) => format(params.value),
        },
        { field: "operatorName", headerName: '操作人員', flex: 5 },
        { field: "remark", headerName: '備註', flex: 5 },
    ],
    defaultColDef: { editable: false, filter: true, sortable: true, resizable: true },
    rowSelection: 'multiple',
    getRowId: (params: GetRowIdParams) => String(params.data.id)
}


async function fetchLogs() {
    try {
        await load()
    } catch (e) {
        console.error(e)
        emit('error', `找不到接料資訊 ${props.uuid}`)
    }
}

watch(
    () => props.show,
    async (val) => {
        if (!val) return
        if (!props.uuid) {
            emit('error', 'production uuid 不存在')
            return
        }
        await fetchLogs()
    },
    { immediate: true }
)

</script>

<template>
    <n-modal
        :show="show"
        preset="dialog"
        title="查詢物料"
        closable
        mask-closable
        close-on-esc
        :style="{ width: '90vw', maxWidth: '1400px' }"
        @update:show="emit('update:show', $event)"
    >
        <div style="height: 350px; padding: 1rem;">
            <ag-grid-vue class="ag-theme-balham-dark" :rowData="rowData" :gridOptions="gridOptions"
                style="height: 100%;"></ag-grid-vue>
        </div>
        <template #action>
            <n-button type="primary" @click="$emit('update:show', false)">確定</n-button>
        </template>
    </n-modal>
</template>
