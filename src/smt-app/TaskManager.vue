<script setup lang="ts">

import { GetRowIdParams, GridOptions, RowNode } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css"; // Core grid CSS, always needed
import "ag-grid-community/styles/ag-theme-balham.css"; // Optional theme CSS
import { AgGridVue } from "ag-grid-vue3"; // the AG Grid Vue Component
import { InputInst, NForm, NFormItem, NGi, NGrid, NInput, NP, NPageHeader, NSpace, NTag, useMessage, NModal, NRadioGroup, NRadioButton, NButton, FormInst, FormRules, useDialog } from 'naive-ui';
import * as Tone from 'tone';
import { onMounted, ref } from 'vue';
import { useMeta } from 'vue-meta';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const message = useMessage();
useMeta({ title: 'TaskManager' });
type TaskRowModel = {
    uuid: string,
    remark?: string
}
const taskRowData = ref<TaskRowModel[]>([]);

const taskGridOptions: GridOptions = {
    // PROPERTIES
    // Column Definitions
    columnDefs: [
        { field: "uuid", headerName: '編號', flex: 3, minWidth: 120 },
        { field: "createdTime", tooltipField: "createdTime", headerName: '建立時間', flex: 5, minWidth: 140 },
        { field: "operatorName", tooltipField: "operatorName", headerName: '操作人員', flex: 5, minWidth: 140 },
        { field: "status", tooltipField: "status", headerName: '狀態', flex: 5, minWidth: 140 },
        { field: "remark", headerName: '備註', flex: 3, minWidth: 120 },
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
    pagination: false,

    // Rendering
    enableCellChangeFlash: true,
    suppressColumnVirtualisation: true,
    suppressRowVirtualisation: false,
    domLayout: 'normal',
    getBusinessKeyForNode: (node: RowNode<TaskRowModel>) => { return `${node.data.uuid}` },

    // RowModel
    rowModelType: 'clientSide',
    getRowId: (params: GetRowIdParams) => { return `${params.data.slotIdno}-${params.data.subSlotIdno}` },

    // Scrolling
    debounceVerticalScrollbar: false,

    // Selection
    enableCellTextSelection: true,
    rowSelection: 'multiple',
    suppressCellFocus: true,

    // Styling
    suppressRowTransform: true,

    // Tooltips
    enableBrowserTooltips: false
}

</script>

<template>
        <n-h1 style="text-align: center;">打件工作管理</n-h1>
        <n-space vertical size="large" style="padding: 1rem;">
        </n-space>
    <div style="height: 2000px; padding: 1rem;">
        <ag-grid-vue class="ag-theme-balham-dark" :rowData="taskRowData" style="height: 100%;"
            :gridOptions="taskGridOptions">
        </ag-grid-vue>
    </div>
</template>