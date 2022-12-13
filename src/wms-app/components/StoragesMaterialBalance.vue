<script setup lang="ts">
import { ColDef, ColumnApi, GridApi, GridOptions, GridReadyEvent } from 'ag-grid-community';
import "ag-grid-community/dist/styles/ag-grid.css"; // Core grid CSS, always needed
import "ag-grid-community/dist/styles/ag-theme-alpine.css"; // Optional theme CSS
import { AgGridVue } from "ag-grid-vue3"; // the AG Grid Vue Component
import { ref } from 'vue';
import { useRoute } from 'vue-router';
import { L1StorageMaterialBalance, OpenAPI, StoragesService } from '../../client';
import { useAuthStore } from '../../stores/auth';

const route = useRoute();
const authStore = useAuthStore();
OpenAPI.TOKEN = JSON.parse( authStore.accountToken )[ 'access_token' ];

const gridApi = ref<GridApi>();
const gridColumnApi = ref<ColumnApi>();

const defaultColDef: ColDef = {
    editable: false,
    filter: true,
    sortable: true,
    resizable: true,
}

const columnDefs: ColDef[] = [
    { field: "l2_storage_idno", headerName: '儲位代碼' },
    { field: "material_idno", headerName: '物料代碼' },
    { field: "balance", headerName: '庫存數量', type: 'rightAligned', valueFormatter: ( params ) => { return params.value.toLocaleString(); } },
];

const gridOptions: GridOptions = {
    columnDefs: columnDefs,
    defaultColDef: defaultColDef,
    stopEditingWhenCellsLoseFocus: true,
    enterMovesDownAfterEdit: true,
    undoRedoCellEditing: true,
    debug: false,
    pagination: true,
    suppressColumnVirtualisation: true,
    suppressRowTransform: true,
    debounceVerticalScrollbar: true,
    enableCellTextSelection: true, // Add a div.ag-cell-wrapper element

    rowSelection: 'single',
    suppressCellFocus: true,
}

const rowData = ref<L1StorageMaterialBalance[]>( [] );

async function onGridReady ( event: GridReadyEvent ) {
    gridApi.value = event.api;
    gridColumnApi.value = event.columnApi;

    rowData.value = await StoragesService.getStorageMaterialsBalance( { l1Id: Number( route.params.id ) } );
    gridApi.value.setRowData( rowData.value );
    gridColumnApi.value.autoSizeAllColumns();
};
</script>


<template>
    <div style="height: 600px; overflow-x: scroll; width: 100%;">
        <ag-grid-vue class="ag-theme-alpine" :rowData=" rowData " style="height: 100%; " :gridOptions=" gridOptions "
            :onGridReady=" onGridReady ">
        </ag-grid-vue>
    </div>
</template>
