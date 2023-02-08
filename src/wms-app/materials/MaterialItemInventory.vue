<script setup lang="ts">
import { GetRowIdParams, GridOptions, RowDataUpdatedEvent, RowNode, ViewportChangedEvent } from "ag-grid-community"
import "ag-grid-community/styles/ag-grid.css" // Core grid CSS, always needed
import "ag-grid-community/styles/ag-theme-alpine.css" // Optional theme CSS
import { AgGridVue } from "ag-grid-vue3" // the AG Grid Vue Component
import { NSpace, NStatistic } from 'naive-ui'
import { computed, onBeforeMount, ref } from 'vue'
import { useRoute } from 'vue-router'
import { InventoryChangeCauseEnum, MaterialsService, MaterialStockRecord } from '../../client'

const route = useRoute();

const inStockBalance = ref<Number>( 0 )
const inProductionBalacne = ref<number>( 0 )
const inLendingBalance = ref<number>( 0 )

const inStockBalanceString = computed( () => { return inStockBalance.value.toLocaleString( undefined, { maximumFractionDigits: 4 } ) } )
const inProductionBalacneString = computed( () => { return inProductionBalacne.value.toLocaleString( undefined, { maximumFractionDigits: 4 } ) } )
const inLendingBalanceString = computed( () => { return inLendingBalance.value.toLocaleString( undefined, { maximumFractionDigits: 4 } ) } )

const materialStockRecords = ref<MaterialStockRecord[]>( [] )
const rowData = ref<any[]>( [] )

const gridOptions: GridOptions = {
    // GRID OPTIONS
    // Column Definitions
    columnDefs: [
        { field: "date", headerName: '日期' },
        { field: "delta_qty", headerName: '異動數量' },
        { field: "cause", headerName: '異動原因' },
    ],
    defaultColDef: { editable: false, filter: true, sortable: true, resizable: true },

    // Column Moving
    suppressMovableColumns: false,
    suppressColumnMoveAnimation: true,

    // Editing
    stopEditingWhenCellsLoseFocus: true,
    enterMovesDownAfterEdit: true,
    undoRedoCellEditing: true,

    // Miscellaneous
    rowBuffer: 100,
    debug: false,
    suppressParentsInRowNodes: true,

    // Pagination
    pagination: true,

    // Rendering
    enableCellChangeFlash: true,
    suppressColumnVirtualisation: true,
    suppressRowVirtualisation: false,
    domLayout: 'normal',
    getBusinessKeyForNode: ( node: RowNode ) => { return node.data.id.toString() },

    // RowModel
    rowModelType: 'clientSide',
    getRowId: ( params: GetRowIdParams ) => { return params.data.id; },

    // Scrolling
    debounceVerticalScrollbar: false,

    // Selection
    enableCellTextSelection: true,
    rowSelection: 'single',
    suppressCellFocus: true,

    // Styling
    suppressRowTransform: true,

    // Tooltips
    enableBrowserTooltips: false,

    // EVENTS
    // Miscellaneous
    onViewportChanged: ( event: ViewportChangedEvent ) => { event.columnApi.autoSizeAllColumns() },

    // RowModel: Client-Side
    onRowDataUpdated: ( event: RowDataUpdatedEvent ) => { event.columnApi.autoSizeAllColumns() },

    // Selection
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
    inStockBalance.value = await MaterialsService.getMaterialInStockBalance( { materialIdno: route.params.idno.toString() } )
    inProductionBalacne.value = await MaterialsService.getMaterialInProductionBalance( { materialIdno: route.params.idno.toString() } )
    inLendingBalance.value = await MaterialsService.getMaterialInLendingBalance( { materialIdno: route.params.idno.toString() } )
    materialStockRecords.value = await MaterialsService.getMaterialStockRecords( { idno: route.params.idno.toString() } )

    let rowId = 1
    for ( let materialStockRecord of materialStockRecords.value ) {
        const row = {
            id: rowId,
            date: materialStockRecord.date,
            delta_qty: materialStockRecord.delta_qty,
            cause: translateCause( materialStockRecord.cause ),
        }
        rowData.value.push( row );
        rowId++
    }
} )
</script>

<template>
    <n-space size="large" vertical>
        <n-space size="large">
            <n-statistic label="可用數量" tabular-nums>{{ inStockBalanceString }}</n-statistic>
            <n-statistic label="在製數量" tabular-nums>{{ inProductionBalacneString }}</n-statistic>
            <n-statistic label="借出數量" tabular-nums>{{ inLendingBalanceString }}</n-statistic>
        </n-space>

        <ag-grid-vue class="ag-theme-alpine" :rowData=" rowData " style="height: 400px; "
            :gridOptions=" gridOptions "></ag-grid-vue>
    </n-space>

</template>
