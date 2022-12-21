<script setup lang="ts">
import { GridOptions, GridReadyEvent, RowDataUpdatedEvent, ViewportChangedEvent } from 'ag-grid-community';
import "ag-grid-community/styles/ag-grid.css"; // Core grid CSS, always needed
import "ag-grid-community/styles/ag-theme-alpine.css"; // Optional theme CSS
import { AgGridVue } from "ag-grid-vue3"; // the AG Grid Vue Component
import { ref } from 'vue';
import { useRoute } from 'vue-router';
import { L1StorageMaterialBalance, OpenAPI, StoragesService } from '../../client';
import { useAuthStore } from '../../stores/auth';

const route = useRoute();
const authStore = useAuthStore();
OpenAPI.TOKEN = JSON.parse( authStore.accountToken )[ 'access_token' ];

const gridOptions: GridOptions = {
    // PROPERTIES
    // Column Definitions
    columnDefs: [
        { field: "l2_storage_idno", headerName: '儲位代碼' },
        { field: "material_idno", headerName: '物料代碼' },
        { field: "balance", headerName: '庫存數量', type: 'rightAligned', valueFormatter: ( params ) => { return params.value.toLocaleString(); } },
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
    debug: false,
    suppressParentsInRowNodes: true,

    // Pagination
    pagination: true,

    // Rendering
    enableCellChangeFlash: true,
    suppressColumnVirtualisation: true,
    suppressRowVirtualisation: false,
    domLayout: 'normal',
        
    // RowModel
    rowModelType: 'clientSide',

    // Scrolling
    debounceVerticalScrollbar: true,

    // Selection
    enableCellTextSelection: true, // Add a div.ag-cell-wrapper element
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
}

const rowData = ref<L1StorageMaterialBalance[]>( [] );

async function onGridReady ( event: GridReadyEvent ) {
    rowData.value = await StoragesService.getStorageMaterialsBalance( { l1Id: Number( route.params.id ) } );
    gridOptions.api.setRowData( rowData.value )
};
</script>


<template>
    <div style="height: 600px; overflow-x: scroll; width: 100%;">
        <ag-grid-vue class="ag-theme-alpine" :rowData=" rowData " style="height: 100%; " :gridOptions=" gridOptions "
            :onGridReady=" onGridReady ">
        </ag-grid-vue>
    </div>
</template>
