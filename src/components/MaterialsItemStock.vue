<script setup lang="ts">
import { ColDef, GetRowIdParams, GridOptions, GridReadyEvent } from "ag-grid-community";
import "ag-grid-community/dist/styles/ag-grid.css"; // Core grid CSS, always needed
import "ag-grid-community/dist/styles/ag-theme-alpine.css"; // Optional theme CSS
import { AgGridVue } from "ag-grid-vue3"; // the AG Grid Vue Component
import { NSpace } from 'naive-ui';
import { onBeforeMount, ref } from 'vue';
import { useRoute } from 'vue-router';
import { MaterialStock, MaterialsService } from '../client';

const route = useRoute();

const gridApi = ref();
const gridColumnApi = ref();
const rowData = ref<MaterialStock[]>( [] );

const columnDefs: ColDef[] = [
    { field: "material_inventory_idno", headerName: '單包代碼' },
    { field: "st_barcode", headerName: '舊 ERP 單包代碼'},
    { field: "l1_storage_idno", headerName: '倉位代碼' },
    { field: "l2_storage_idno", headerName: '儲位代碼' },
    { field: "quantity", headerName: '數量' },
];

const defaultColDef = {
    editable: false,
    filter: true,
    sortable: true,
    flex: 1, // Every columns have the same portion of width
    resizable: true,
}

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
    enableCellTextSelection: true,

    rowSelection: 'single',
    suppressCellFocus: true,
}


onBeforeMount( async () => { rowData.value = await MaterialsService.getMaterialStock( route.params.idno.toString() ) } );

function getRowId ( params: GetRowIdParams ) { return params.data.material_inventory_id; }

async function onGridReady ( params: GridReadyEvent ) {
    gridApi.value = params.api;
    gridColumnApi.value = params.columnApi;
};
</script>

<template>
    <n-space size="large" vertical>
        <n-space size="large">
        </n-space>

        <ag-grid-vue class="ag-theme-alpine" :rowData=" rowData " style="height: 400px; " :gridOptions=" gridOptions "
            :getRowId=" getRowId " :onGridReady=" onGridReady "></ag-grid-vue>
    </n-space>

</template>
