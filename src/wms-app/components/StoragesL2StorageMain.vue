<script setup lang="ts">
import { GetRowIdParams, GridOptions, RowDataUpdatedEvent, RowNode, ViewportChangedEvent } from 'ag-grid-community'
import "ag-grid-community/styles/ag-grid.css" // Core grid CSS, always needed
import "ag-grid-community/styles/ag-theme-alpine.css" // Optional theme CSS
import { AgGridVue } from "ag-grid-vue3" // the AG Grid Vue Component
import { NButton, NFormItem, NModal, NSelect, NSpace, NText, SelectGroupOption, SelectOption, useMessage } from 'naive-ui'
import { h, onBeforeMount, ref, VNodeChild } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { L2StorageBatchMove, L2StorageRead, OpenAPI, StorageRead, StoragesService } from '../../client/index'
import { useAuthStore } from '../../stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
OpenAPI.TOKEN = JSON.parse( authStore.accountToken )[ 'access_token' ]
const message = useMessage();

let L1Storage: StorageRead

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

const showModal = ref( false )

let storageL1List: StorageRead[]

let storageL1SelectOptions: Array<SelectOption | SelectGroupOption> = []

const toMoveStorageL1Id = ref<number | null>( null )


async function refreshDataTable () {
    L1Storage = await StoragesService.getStorage( { l1Id: Number( route.params.id ) } )
    rowData.value = L1Storage.l2_storages
    gridOptions.api.setRowData( rowData.value )
}


onBeforeMount( async () => { await refreshDataTable() } )



function onClickBatchEditButton ( event: Event ) { router.push( `/wms/storages/${ route.params.id.toString() }/edit-inner-storages` ) }


function renderLabel ( option: SelectOption | SelectGroupOption, selected: boolean ): VNodeChild {
    return h(
        'div', // HTML tag
        null, // Tag's attributes
        [
            h( NText, { style: 'padding-end: 1em;' }, { default: () => { return option.label } } ),
            h( NText, { depth: 3 }, {
                default: () => {
                    const matchedL1Storage = storageL1List.find( element => element.id == option.value )
                    return matchedL1Storage?.name
                },
            } ),
        ]
    )
}


async function onClickBatchMoveButton ( event: Event ) {
    // Get selected rows
    const selectedRows: L2StorageRead[] = gridOptions.api?.getSelectedRows()
    if ( selectedRows.length === 0 ) { return false }

    // Assign L1 storage from selected L2
    toMoveStorageL1Id.value = L1Storage.id

    // Build storage L1 select options
    storageL1List = await StoragesService.getStorages()
    for ( let storageL1 of storageL1List ) { storageL1SelectOptions.push( { label: storageL1.idno, value: storageL1.id } ) }

    showModal.value = true
}



async function onSubmitMoveDialog ( event: Event ) {
    // Get selected rows
    const selectedRows: L2StorageRead[] = gridOptions.api?.getSelectedRows()
    if ( selectedRows.length === 0 ) { return false }

    // Build request body
    const requestBody: L2StorageBatchMove = { move_to_l1_id: toMoveStorageL1Id.value, l2_id_list: [] }
    for ( let row of selectedRows ) { requestBody.l2_id_list.push( row.id ) }

    try {
        const response = await StoragesService.batchMoveL2Storages( { requestBody: requestBody } )
        message.success( '搬移成功' )
        await refreshDataTable()
    }
    catch ( error ) {
        message.error( '搬移失敗' )
        return false
    }
}
</script>


<template>
    <n-space size="large" style="margin-bottom: 1rem;">
        <n-button @click=" onClickBatchEditButton( $event ) " attr-type="button">批次編輯</n-button>
        <n-button @click=" onClickBatchMoveButton( $event ) " attr-type="button">批次搬移</n-button>
    </n-space>
    <div style="height: 600px; overflow-x: scroll; width: 100%;">
        <ag-grid-vue class="ag-theme-alpine" :rowData=" rowData " style="height: 100%; "
            :gridOptions=" gridOptions "></ag-grid-vue>
    </div>

    <n-modal v-model:show=" showModal " preset="dialog" style="width: 800px; max-width: 80vw;" positive-text="確認"
        @positive-click=" onSubmitMoveDialog( $event ) " :show-icon=" false " title="批次搬移">
        <n-form-item label="搬移至">
            <n-select v-model:value.lazy=" toMoveStorageL1Id " :options=" storageL1SelectOptions " size="large"
                filterable :render-label=" renderLabel "></n-select>
        </n-form-item>
    </n-modal>
</template>
