<script setup lang="ts">
import { ColDef, GetRowIdParams, GridOptions, GridReadyEvent } from "ag-grid-community"
import "ag-grid-community/styles/ag-grid.css" // Core grid CSS, always needed
import "ag-grid-community/styles/ag-theme-alpine.css" // Optional theme CSS
import { AgGridVue } from "ag-grid-vue3" // the AG Grid Vue Component
import { NSpace, NStatistic } from 'naive-ui'
import { onBeforeMount, ref } from 'vue'
import { useRoute } from 'vue-router'
import { InventoryChangeCauseEnum, MaterialsService, MaterialStockRecord } from '../../client'

const route = useRoute();

const inStockBalance = ref<Number>( 0 );
const inProductionBalacne = ref<number>( 0 );
const inLendingBalance = ref<number>( 0 );

const gridApi = ref();
const gridColumnApi = ref();
const materialStockRecords = ref<MaterialStockRecord[]>( [] );
const rowData = ref<any[]>( [] );

const columnDefs: ColDef[] = [
    { field: "date", headerName: '日期' },
    { field: "delta_qty", headerName: '異動數量' },
    { field: "cause", headerName: '異動原因' },
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

function translateCause ( cause: InventoryChangeCauseEnum ) {
    switch ( cause ) {
        case InventoryChangeCauseEnum.RECEVING: return '收料';
        case InventoryChangeCauseEnum.TRANSFERRING: return '調撥';
        case InventoryChangeCauseEnum.ISSUING: return '發料';
        case InventoryChangeCauseEnum.SPLITTING: return '分割';
        case InventoryChangeCauseEnum.ISSUE_RETURNING: return '發料退回';
    }
    return '其他';
}

onBeforeMount( async () => {
    inStockBalance.value = await MaterialsService.getMaterialInStockBalance( { materialIdno: route.params.idno.toString() } );
    inProductionBalacne.value = await MaterialsService.getMaterialInProductionBalance( { materialIdno: route.params.idno.toString() } );
    inLendingBalance.value = await MaterialsService.getMaterialInLendingBalance( { materialIdno: route.params.idno.toString() } );
    materialStockRecords.value = await MaterialsService.getMaterialStockRecords( { idno: route.params.idno.toString() } );

    let rowId = 1
    for ( let materialStockRecord of materialStockRecords.value ) {
        const row = {
            id: rowId,
            date: materialStockRecord.date,
            delta_qty: materialStockRecord.delta_qty,
            cause: translateCause( materialStockRecord.cause ),
        }
        rowData.value.push( row );
        rowId++;
    }
} );

function getRowId ( params: GetRowIdParams ) { return params.data.id; }

async function onGridReady ( params: GridReadyEvent ) {
    gridApi.value = params.api;
    gridColumnApi.value = params.columnApi;
};
</script>

<template>
    <n-space size="large" vertical>
        <n-space size="large">
            <n-statistic label="可用數量" tabular-nums>{{ inStockBalance.toLocaleString() }}</n-statistic>
            <n-statistic label="在製數量" tabular-nums>{{ inProductionBalacne.toLocaleString() }}</n-statistic>
            <n-statistic label="借出數量" tabular-nums>{{ inLendingBalance.toLocaleString() }}</n-statistic>
        </n-space>

        <ag-grid-vue class="ag-theme-alpine" :rowData=" rowData " style="height: 400px; " :gridOptions=" gridOptions "
            :getRowId=" getRowId " :onGridReady=" onGridReady "></ag-grid-vue>
    </n-space>

</template>
