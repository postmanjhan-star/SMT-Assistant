<script setup lang="ts">
// 儲位可以加，可以改，不能刪。

import { ColDef, ColumnApi, GridApi, GridOptions } from "ag-grid-community";
import "ag-grid-community/dist/styles/ag-grid.css"; // Core grid CSS, always needed
import "ag-grid-community/dist/styles/ag-theme-alpine.css"; // Optional theme CSS
import { AgGridVue } from "ag-grid-vue3"; // the AG Grid Vue Component
import { NButton, NH2, NSpace, useMessage } from 'naive-ui';
import { onBeforeMount, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { L2StorageCreate, L2StorageRead, L2StorageUpdate, OpenAPI, StoragesService } from '../client';
import { useAuthStore } from '../stores/auth';

const message = useMessage();

const authStore = useAuthStore();
OpenAPI.TOKEN = JSON.parse( authStore.accountToken )[ 'access_token' ];

const route = useRoute();
const router = useRouter();

let l1_storage_id: number;
const rowData = ref<L2StorageRead[]>( [] );

const gridApi = ref<GridApi>();
const gridColumnApi = ref<ColumnApi>();

const defaultColDef: ColDef = {
  editable: true,
  filter: true,
  sortable: true,
  resizable: true,
}

const columnDefs: ColDef[] = [
  { field: "idno", headerName: '儲位代碼' },
  { field: "name", headerName: '儲位名稱' },
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

onBeforeMount( async () => {
  try {
    const response = await StoragesService.getStorage( { l1Id: Number( route.params.id ) } );
    rowData.value = response.l2_storages;
    gridApi.value.setRowData( rowData.value );
    gridColumnApi.value.autoSizeAllColumns();
    l1_storage_id = response.id;
  } catch ( error ) { console.error( error ); }
} )

function getRowId ( params ) { return params.data.id; }

function onGridReady ( params ) {
  gridApi.value = params.api;
  gridColumnApi.value = params.columnApi;
};

let newRowId = -1
function handleCreateL2StorageButtonClick ( event: Event ) {
  rowData.value.unshift( { id: newRowId, idno: '', name: '' } );
  gridApi.value.setRowData( rowData.value );
  newRowId--;
}

async function handleUpdateL2StorageButtonClick ( event: Event ) {
  // Check all required fields
  for ( let row of rowData.value ) {
    if ( !row.id || !row.idno || !row.name ) {
      message.error( '請輸入儲位' );
      return false;
    }
  }

  // Convert all fields to uppercase
  rowData.value.forEach( ( row, index ) => {
    rowData.value[ index ].idno = row.idno.toUpperCase();
    rowData.value[ index ].name = row.name.toUpperCase();
  } )

  // Check there is no duplicated idno
  const idnoArr = rowData.value.map( ( row ) => row.idno );
  const isDuplicate = idnoArr.some( ( idno, index ) => idnoArr.indexOf( idno ) != index )
  if ( isDuplicate ) {
    message.error( '儲位代碼不可重複' );
    return false;
  }

  // Create and update
  const to_update: L2StorageUpdate[] = [];
  const to_create: L2StorageCreate[] = [];

  for ( let entry of rowData.value ) {
    if ( entry.id >= 0 ) { to_update.push( entry ); }
    else { to_create.push( entry ); }
  }

  if ( to_update.length >= 1 ) {
    for ( let row of to_update ) {
      try { const response = await StoragesService.updateL2Storage( { l1Id: l1_storage_id, l2Id: row.id, requestBody: row } ); }
      catch ( error ) {
        message.error( '儲位更新失敗' );
        return false;
      }
    }
    message.success( '儲位更新成功' );
  }

  if ( to_create.length >= 1 ) {
    for ( let row of to_create ) {
      try { const response = await StoragesService.createL2Storage( { l1Id: l1_storage_id, requestBody: row } ); }
      catch ( error ) {
        message.error( '儲位建立失敗' );
        return false;
      }
    }
    message.success( '儲位建立成功' );
  }

  router.push( '/storages' ); // Stay on the same page?
}
</script>

<template>
  <div style="padding: 1rem;">
    <n-space size="large" item-style="height: 40px; vertical-align: center" :align=" 'center' ">
      <n-h2 style="font-size: 1.2rem; margin-bottom: unset;">儲位</n-h2>
    </n-space>

    <n-space vertical size="large"
      style="background-color: white; padding: 1rem; box-shadow: 0px 4px 20px -4px hsla(0, 0%, 60%, 0.4)">

      <n-space size="large">
        <n-button type="primary" secondary strong size="large" @click=" handleCreateL2StorageButtonClick( $event ) "
          attr-type="button">
          建立新儲位
        </n-button>
      </n-space>

      <div style="height: 600px; overflow-x: scroll; width: 100%;">
        <ag-grid-vue class="ag-theme-alpine" :rowData=" rowData " style="height: 100%; " :gridOptions=" gridOptions "
          :getRowId=" getRowId " :onGridReady=" onGridReady ">
        </ag-grid-vue>
      </div>


      <n-button type="primary" size="large" @click=" handleUpdateL2StorageButtonClick( $event ) " attr-type="submit"
        block>
        更新儲位
      </n-button>

    </n-space>
  </div>
</template>

<style>

</style>
