<script setup lang="ts">

import { GetRowIdParams, GridOptions, RowNode } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css"; // Core grid CSS, always needed
import "ag-grid-community/styles/ag-theme-balham.css"; // Optional theme CSS
import { AgGridVue } from "ag-grid-vue3"; // the AG Grid Vue Component
import { onMounted, ref, watch } from 'vue';
import { useMeta } from 'vue-meta';
import { useRoute, useRouter } from 'vue-router';

import {
    ApiError,
    WorkflowSummaryRead,
    WorkflowService
} from '@/client';

const router = useRouter();

useMeta({ title: 'TaskManager' });
type TaskRowModel = {
    uuid: string,
    createdTime: string,
    updatedTime?: string | null,
    operatorName?: string | null,
    status?: string | null
    remark?: string | null
}

const pageSize = ref(20)
const currentPage = ref(1)
const total = ref(0) // 如果後端有提供總筆數
const taskRowData = ref<TaskRowModel[]>([])
const loading = ref(false)

const statusRefData = {
    worker_start_production: '🟢 生產中',
    end_production: '⚪ 已結束'
}

const productionModeRefData = {
    NORMAL_PRODUCE_MODE: '✅正式',
    TESTING_PRODUCE_MODE: '🧪試產'
}

const taskGridOptions: GridOptions = {
    // PROPERTIES
    // Column Definitions
    columnDefs: [
        { field: "createdTime", tooltipField: "createdTime", headerName: '建立時間', flex: 5, minWidth: 140 },
        { field: "workOrderIdno", tooltipField: "workOrderIdno", headerName: '工令', flex: 3, minWidth: 100 },
        { field: "machineIdno", tooltipField: "machineIdno", headerName: '線別', flex: 3, minWidth: 100 },
        { field: "productIdno", tooltipField: "productIdno", headerName: '成品料號', flex: 3, minWidth: 180 },
        { field: "operatorName", tooltipField: "operatorName", headerName: '操作人員', flex: 5, minWidth: 100 },
        { field: "mounterType", tooltipField: "mounterType", headerName: '上料機類型', flex: 3, minWidth: 100 },
        { field: "productionMode", headerName: '生產模式', flex: 3, minWidth: 50, refData: productionModeRefData },
        { field: "status", tooltipField: "status", headerName: '狀態', flex: 3, minWidth: 80, refData: statusRefData }
    ],
    defaultColDef: { editable: false, filter: true, sortable: true, resizable: true },

    // Column Moving
    suppressMovableColumns: false,
    suppressColumnMoveAnimation: true,

    // Editing
    stopEditingWhenCellsLoseFocus: true,
    enterNavigatesVerticallyAfterEdit: true,
    undoRedoCellEditing: true,

    // Miscellaneous
    rowBuffer: 100,
    valueCache: true,
    debug: false,

    // Pagination
    // pagination: true,
    // paginationPageSize: 20,

    // Rendering
    enableCellChangeFlash: true,
    suppressColumnVirtualisation: true,
    suppressRowVirtualisation: false,
    domLayout: 'normal',
    getBusinessKeyForNode: (node: RowNode<TaskRowModel>) => { return `${node.data.uuid}` },

    // RowModel
    // rowModelType: 'clientSide',
    getRowId: (params: GetRowIdParams) => { return params.data.uuid },

    // Scrolling
    debounceVerticalScrollbar: false,

    // Selection
    enableCellTextSelection: true,
    rowSelection: 'multiple',
    suppressCellFocus: true,

    // Styling
    suppressRowTransform: true,

    // Tooltips
    enableBrowserTooltips: false,

    onRowClicked: (event) => {
        const uuid = event.data.uuid
        router.push(`/smt/panasonic-mounter-production/${uuid}`)
    }
}

function formatDateTime(value?: string | null): string {
    if (!value) return ''

    const date = new Date(value)

    const pad = (n: number) => String(n).padStart(2, '0')

    return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ` +
        `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

async function fetchWorkflows() {
    loading.value = true
    try {
        const skip = (currentPage.value - 1) * pageSize.value
        const limit = pageSize.value

        const data = await WorkflowService.getSummariesOfWorkflows({
            skip,
            limit
        })

        taskRowData.value = data.map(workflow => ({
            uuid: workflow.production_id,
            createdTime: formatDateTime(workflow.created_at),
            updatedTime: workflow.updated_at,
            mounterType: workflow.mounter_type ?? '',
            machineIdno: workflow.mounter?.machine_idno ?? '',
            workOrderIdno: workflow.mounter?.work_order_idno ?? '',
            productIdno: workflow.mounter?.product_idno ?? '',
            operatorName: workflow.operator_id ?? '',
            productionMode: workflow.mounter?.produce_mode ?? '',
            status: workflow.last_task?.task_spec ?? 'UNKNOWN'
        }))

        // ⚠️ 如果後端有回 total，這裡要一起存
        // total.value = response.total

    } catch (e) {
        console.error(e)
    } finally {
        loading.value = false
    }
}




watch([currentPage, pageSize], fetchWorkflows, { immediate: true })


onMounted(async () => {
    fetchWorkflows()
    // try {
    //     workflowData.value = await WorkflowService.getSummariesOfWorkflows({})

    // } catch (error) {
    //     if (error instanceof ApiError && error.status === 404) { router.push('/http-status/404') }
    //     else if (error instanceof ApiError && error.status === 503) { router.push('/http-status/404') }
    // }
    // for (let workflow of workflowData.value) {
    //     taskRowData.value.push({
    //         uuid: workflow.production_id,
    //         createdTime: workflow.created_at,
    //         updatedTime: workflow.updated_at,
    //         operatorName: workflow.operator_id,
    //         status: workflow.last_task.task_spec
    //     })
    // }

}
)

</script>

<template>
    <n-h1 style="text-align: center;">打件工作管理</n-h1>
    <n-space vertical size="large" style="padding: 1rem;">
    </n-space>
    <div style="height: 70vh; padding: 1rem;">
        <ag-grid-vue class="ag-theme-balham-dark" :rowData="taskRowData" style="height: 100%;"
            :gridOptions="taskGridOptions">
        </ag-grid-vue>
    </div>

    <n-space justify="end" style="padding: 0 1rem 1rem;">
        <n-pagination v-model:page="currentPage" v-model:page-size="pageSize" :page-sizes="[10, 20, 50]"
            :item-count="total || 9999" show-size-picker />
    </n-space>
</template>