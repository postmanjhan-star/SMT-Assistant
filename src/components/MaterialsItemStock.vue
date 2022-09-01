<script setup lang="ts">
import { ColDef, GetRowIdParams, GridApi, GridOptions, GridReadyEvent } from "ag-grid-community";
import "ag-grid-community/dist/styles/ag-grid.css"; // Core grid CSS, always needed
import "ag-grid-community/dist/styles/ag-theme-alpine.css"; // Optional theme CSS
import { AgGridVue } from "ag-grid-vue3"; // the AG Grid Vue Component
import { NButton, NSpace, useMessage } from 'naive-ui';
import { onBeforeMount, ref } from 'vue';
import { useRoute } from 'vue-router';
import { MaterialInventoriesService, MaterialInventoryRead, MaterialsService, OpenAPI, StoragesService, StorageTypeEnum } from '../client';
import { useAuthStore } from '../stores/auth';



const authStore = useAuthStore();
OpenAPI.TOKEN = JSON.parse( authStore.accountToken )[ 'access_token' ];

const route = useRoute();
const message = useMessage();

const backendBaseUrl = import.meta.env.VITE_BACKEND_BASE_URL;

const gridApi = ref<GridApi>();
const gridColumnApi = ref();
const rowData = ref<MaterialInventoryRead[]>( [] );



const columnDefs: ColDef[] = [
    // { checkboxSelection: true, flex: 1 }, // Do not use checkbox for multiple rows selection to save space on mobile devices.
    { field: "idno", headerName: '單包代碼' },
    { field: "st_barcode", headerName: '舊 ERP 單包代碼' },
    { field: "l1_storage_idno", headerName: '倉位代碼' },
    { field: "l2_storage_idno", headerName: '儲位代碼' },
    { field: "latest_qty", headerName: '數量' },
];



const defaultColDef: ColDef = {
    editable: false,
    filter: true,
    sortable: true,
    flex: 6, // Every columns have the same portion of width
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

    rowSelection: 'multiple',
    rowMultiSelectWithClick: true,
    suppressCellFocus: true,
}




onBeforeMount( async () => { rowData.value = await MaterialsService.getMaterialInventories( { materialIdno: route.params.idno.toString() } ) } );



function getRowId ( params: GetRowIdParams ) { return params.data.id; }



async function onGridReady ( params: GridReadyEvent ) {
    gridApi.value = params.api;
    gridColumnApi.value = params.columnApi;
}



async function handleSplitButtonClick ( event: Event ) {
    // Get selected rows
    const selectedRows: MaterialInventoryRead[] = gridApi.value.getSelectedRows();

    // Check if a row is selected
    if ( selectedRows.length === 0 ) {
        message.info( '請選擇單包' );
        return false;
    }

    // Check if only one row is selected
    if ( selectedRows.length > 1 ) {
        message.info( '請選擇單包' );
        return false;
    }

    const selectedRow = selectedRows[ 0 ];

    // Many checks
    // Locked?
    if ( selectedRow.issuing_locked ) {
        message.warning( '此包已被發料單鎖定不可分割' );
        return false;
    }

    // Parent's quantity enough?
    if ( selectedRow.latest_qty <= 1 ) {
        message.warning( '此包數量不足以分割' );
        return false;
    }

    // Splitting only applies to parent inventories
    if ( selectedRow.parent_material_inventory_id !== null ) {
        message.warning( '此包已為子包不可再分割' );
        return false;
    }

    // Parent's stored in interal warehouse?
    const storage = await StoragesService.getStorage( { l1Id: selectedRow.l1_storage_id } );
    if ( storage.type != StorageTypeEnum.INTERNAL_WAREHOUSE ) {
        message.warning( '此包不存在倉庫內不可分割' );
        return false;
    }

    const childQuantity: number = Number( prompt( '請輸入子包數量', '0' ) );

    // Input a qualify number?
    if ( Number.isNaN( childQuantity ) || childQuantity <= 0 ) {
        message.warning( '請輸入數量' );
        return false;
    }

    // Child's quantity must less than parent's quantity
    if ( childQuantity >= selectedRow.latest_qty ) {
        message.warning( '子包數量必須小於母包數量' );
        return false;
    }

    try {
        // Create child inventory. Backend also handles parent inventory's quantity substracting.
        const childMaterialInventory = await MaterialInventoriesService.splitMaterialInventory( { materialInventoryIdno: selectedRow.idno, childQuantity: childQuantity } );

        // Substract the parent inventory's queantiy value in frontend
        rowData.value.forEach( ( row, index, array ) => { if ( row.idno == selectedRow.idno ) { array[ index ].latest_qty -= childQuantity; } } );

        // Insert a new row of the child inventory
        rowData.value.unshift( childMaterialInventory );
        gridApi.value.setRowData( rowData.value );
    } catch ( error ) {
        message.error( '分割失敗' );
        return false;
    }
}



async function handleGenerateLabelsButtonClick ( event: Event ) {
    // Get selected rows
    const selectedRows: MaterialInventoryRead[] = gridApi.value.getSelectedRows();

    // Check if at least one row is selected
    if ( selectedRows.length === 0 ) {
        message.info( '請選擇單包' );
        return false;
    }

    const url = new URL( backendBaseUrl + '/material_inventories/labels' );
    for ( let row of selectedRows ) { url.searchParams.append( 'material_inventory_idnos', row.idno ); }

    console.debug( url );
    window.open( url, '_blank' );
}
</script>



<template>
    <n-space size="large" vertical>
        <n-space size="large">
        </n-space>

        <n-space size="large">
            <n-button type="primary" secondary strong @click=" handleSplitButtonClick ">分割單包</n-button>
            <n-button type="primary" secondary strong @click=" handleGenerateLabelsButtonClick ">產生 WMS 標籤貼紙</n-button>
        </n-space>

        <ag-grid-vue class="ag-theme-alpine" :rowData=" rowData " style="height: 400px; " :gridOptions=" gridOptions "
            :getRowId=" getRowId " :onGridReady=" onGridReady "></ag-grid-vue>
    </n-space>

</template>
