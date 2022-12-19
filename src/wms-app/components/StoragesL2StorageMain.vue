<script setup lang="ts">
import { GetRowIdParams, GridOptions, RowDataUpdatedEvent, RowNode, ViewportChangedEvent } from 'ag-grid-community'
import "ag-grid-community/dist/styles/ag-grid.css" // Core grid CSS, always needed
import "ag-grid-community/dist/styles/ag-theme-alpine.css" // Optional theme CSS
import { AgGridVue } from "ag-grid-vue3" // the AG Grid Vue Component
import { NButton, NSpace } from 'naive-ui'
import { onBeforeMount, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { L2StorageRead, OpenAPI, StoragesService } from '../../client/index'
import { useAuthStore } from '../../stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
OpenAPI.TOKEN = JSON.parse( authStore.accountToken )[ 'access_token' ]

const gridOptions: GridOptions = {
    // PROPERTIES
    // Column Definitions
    columnDefs: [
        { field: "idno", headerName: '儲位代碼' },
        { field: "name", headerName: '儲位名稱' },
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
    getBusinessKeyForNode: ( node: RowNode<L2StorageRead> ) => { return node.data.id.toString() },

    // RowModel
    rowModelType: 'clientSide',
    getRowId: ( params: GetRowIdParams ) => { return params.data.id },

    // Scrolling
    debounceVerticalScrollbar: true,

    // Selection
    enableCellTextSelection: true, // Add a div.ag-cell-wrapper element
    rowSelection: 'multiple',
    rowMultiSelectWithClick: true,
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

const rowData = ref<L2StorageRead[]>( [] );


onBeforeMount( async () => {
    const L1Storage = await StoragesService.getStorage( { l1Id: Number( route.params.id ) } );
    rowData.value = L1Storage.l2_storages;
    gridOptions.api.setRowData( rowData.value )
} );

function onClickBatchEditButton ( event: Event ) { router.push( `/wms/storages/${ route.params.id.toString() }/edit-inner-storages` ) }
</script>


<template>
    <n-space size="large" style="margin-bottom: 1rem;">
        <n-button @click=" onClickBatchEditButton( $event ) " attr-type="button">批次編輯</n-button>
    </n-space>
    <div style="height: 600px; overflow-x: scroll; width: 100%;">
        <ag-grid-vue class="ag-theme-alpine" :rowData=" rowData " style="height: 100%; "
            :gridOptions=" gridOptions "></ag-grid-vue>
    </div>
</template>
