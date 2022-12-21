<script setup lang="ts">
import { GetRowIdParams, GridOptions, RowDataUpdatedEvent, RowNode, ViewportChangedEvent } from 'ag-grid-community';
import "ag-grid-community/styles/ag-grid.css"; // Core grid CSS, always needed
import "ag-grid-community/styles/ag-theme-alpine.css"; // Optional theme CSS
import { AgGridVue } from "ag-grid-vue3"; // the AG Grid Vue Component
import { NA, NBreadcrumb, NBreadcrumbItem, NButton, NH1, NH2, NSpace, useMessage } from 'naive-ui';
import { onBeforeMount, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { L2StorageCreate, L2StorageRead, L2StorageUpdate, OpenAPI, StorageRead, StoragesService, StorageTypeEnum } from '../../client/index';
import { useAuthStore } from '../../stores/auth';

const route = useRoute()
const router = useRouter()
const message = useMessage()

const authStore = useAuthStore()
OpenAPI.TOKEN = JSON.parse( authStore.accountToken )[ 'access_token' ]

const l1Storage = ref<StorageRead>( {
  id: 0,
  idno: '',
  name: '',
  type: StorageTypeEnum.INTERNAL_WAREHOUSE,
  l2_storages: [],
} )
const rowData = ref<L2StorageRead[]>( [] );

const gridOptions: GridOptions = {
  // PROPERTIES
  // Column Definitions
  columnDefs: [
    { field: "idno", headerName: '儲位代碼' },
    { field: "name", headerName: '儲位名稱' },
  ],
  defaultColDef: { editable: true, filter: true, sortable: true, resizable: true },

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


onBeforeMount( async () => {
  try {
    l1Storage.value = await StoragesService.getStorage( { l1Id: Number( route.params.id ) } );
    rowData.value = l1Storage.value.l2_storages;
    gridOptions.api.setRowData( rowData.value );
  } catch ( error ) { console.error( error ); }
} )



let newRowId = -1
function onClickCreateL2StorageButton ( event: Event ) {
  rowData.value.unshift( { id: newRowId, idno: '', name: '' } )
  gridOptions.api.setRowData( rowData.value )
  newRowId--
}


async function onClickUpdateL2StorageButton ( event: Event ) {
  // Check all required fields
  for ( let row of rowData.value ) {
    if ( !row.id || !row.idno || !row.name ) {
      message.error( '請輸入儲位' )
      return false
    }
  }

  // Convert all fields to uppercase
  rowData.value.forEach( ( row, index ) => {
    rowData.value[ index ].idno = row.idno.toUpperCase()
    rowData.value[ index ].name = row.name.toUpperCase()
  } )

  // Check there is no duplicated idno
  const idnoArr = rowData.value.map( ( row ) => row.idno )
  const isDuplicate = idnoArr.some( ( idno, index ) => idnoArr.indexOf( idno ) != index )
  if ( isDuplicate ) {
    message.error( '儲位代碼不可重複' )
    return false
  }

  // Create and update
  const to_update: L2StorageRead[] = []
  const to_create: L2StorageCreate[] = []

  for ( let entry of rowData.value ) {
    if ( entry.id >= 0 ) { to_update.push( entry ) }
    else { to_create.push( entry ) }
  }

  if ( to_update.length >= 1 ) {
    for ( let row of to_update ) {
      const updateData: L2StorageUpdate = { idno: row.idno, name: row.name }
      try { const response = await StoragesService.updateL2Storage( { l1Id: l1Storage.value.id, l2Id: row.id, requestBody: updateData } ) }
      catch ( error ) {
        message.error( '儲位更新失敗' )
        return false;
      }
    }
    message.success( '儲位更新成功' )
  }

  if ( to_create.length >= 1 ) {
    for ( let row of to_create ) {
      try { const response = await StoragesService.createL2Storage( { l1Id: l1Storage.value.id, requestBody: row } ) }
      catch ( error ) {
        message.error( '儲位建立失敗' )
        return false;
      }
    }
    message.success( '儲位建立成功' )
  }
  router.push( { path: `/wms/storages/${ l1Storage.value.id }`, query: { tab: 'l2_storages' } } )
}
</script>



<template>
  <main
    style="min-height: calc(100vh - 60px); background-color: hsla(0, 0%, 92%, 1.0); background-image: url('/pattern.svg'); background-repeat: repeat-x; background-position: center; background-size: cover;">
    <n-breadcrumb
      style="padding: 1rem; box-shadow: 0px 4px 20px -4px hsla(0, 0%, 60%, 0.4); position: relative; background-color: white; z-index: 1; overflow: auto;">
      <n-breadcrumb-item>
        <router-link to="/wms/home" #=" { navigate, href } " custom>
          <n-a :href=" href " @click=" navigate ">首頁</n-a>
        </router-link>
      </n-breadcrumb-item>
      <n-breadcrumb-item>基本資料管理</n-breadcrumb-item>
      <n-breadcrumb-item>
        <router-link to="/wms/storages" #=" { navigate, href } " custom>
          <n-a :href=" href " @click=" navigate ">倉位管理</n-a>
        </router-link>
      </n-breadcrumb-item>
      <n-breadcrumb-item>
        <router-link :to=" `/wms/storages/${ l1Storage.id }` " #=" { navigate, href } " custom>
          <n-a :href=" href " @click=" navigate ">{{ l1Storage.idno.toUpperCase() }}</n-a>
        </router-link>
      </n-breadcrumb-item>
      <n-breadcrumb-item>批次編輯儲位</n-breadcrumb-item>
    </n-breadcrumb>

    <div style="padding: 1rem;">
      <n-h1 prefix="bar" style="font-size: 1.4rem;">倉位 {{ l1Storage.idno.toUpperCase() }}</n-h1>
      <n-space vertical size="large"
        style="background-color: white; padding: 1rem; box-shadow: 0px 4px 20px -4px hsla(0, 0%, 60%, 0.4)">

        <n-h2>批次編輯儲位</n-h2>

        <n-space size="large">
          <n-button type="primary" secondary strong size="large" @click=" onClickCreateL2StorageButton( $event ) "
            attr-type="button"> 建立新儲位 </n-button>
        </n-space>

        <div style="height: 600px; overflow-x: scroll; width: 100%;">
          <ag-grid-vue class="ag-theme-alpine" :rowData=" rowData " style="height: 100%; "
            :gridOptions=" gridOptions "></ag-grid-vue>
        </div>

        <n-button type="primary" size="large" @click=" onClickUpdateL2StorageButton( $event ) " attr-type="submit"
          block>更新儲位</n-button>

      </n-space>
    </div>

  </main>
</template>
