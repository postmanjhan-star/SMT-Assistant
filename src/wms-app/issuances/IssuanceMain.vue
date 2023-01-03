<script setup lang="ts">
import { GetRowIdParams, GridOptions, RowDataUpdatedEvent, RowDoubleClickedEvent, RowNode, ViewportChangedEvent } from "ag-grid-community"
import "ag-grid-community/styles/ag-grid.css" // Core grid CSS, always needed
import "ag-grid-community/styles/ag-theme-alpine.css" // Optional theme CSS
import { AgGridVue } from "ag-grid-vue3" // the AG Grid Vue Component
import { NA, NBreadcrumb, NBreadcrumbItem, NButton, NH1, NSpace, NTooltip, useMessage } from 'naive-ui'
import { onBeforeMount, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { IssuanceRead, IssuancesService, OpenAPI } from '../../client'
import { useAuthStore } from '../../stores/auth'



const message = useMessage();
const router = useRouter();

const authStore = useAuthStore();
OpenAPI.TOKEN = JSON.parse( authStore.accountToken )[ 'access_token' ];

let issuances: IssuanceRead[];

type Row = {
  'id': number,
  'createdAt': string,
  'updatedAt': string,
  'idno': string,
  'date': string | undefined,
  'issuingCompleted': string,
}

const rowData = ref<Row[]>( [] );


const gridOptions: GridOptions = {
  // PROPERTIES
  // Column Definitions
  columnDefs: [
    { field: "idno", headerName: '發料單號' },
    { field: "updatedAt", headerName: '最後異動時間' },
    { field: "date", headerName: '發料日期' },
    { field: "issuingCompleted", headerName: '已發料完成' },
  ],
  defaultColDef: { filter: true, sortable: true, flex: 1, resizable: true },

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
  getBusinessKeyForNode: ( node: RowNode<Row> ) => { return node.data.id.toString() },

  // RowModel
  rowModelType: 'clientSide',
  getRowId: ( params: GetRowIdParams ) => { return params.data.id },

  // Scrolling
  debounceVerticalScrollbar: true,

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
  onRowDoubleClicked: ( event: RowDoubleClickedEvent ) => router.push( `/wms/issuances/${ event.data.idno }` ),
}



onBeforeMount( async () => {
  issuances = await IssuancesService.getIssuances()

  for ( let issuance of issuances ) {
    let issuingCompleted: string
    issuance.issuing_completed ? issuingCompleted = '✅' : issuingCompleted = ''
    rowData.value.push( {
      id: issuance.id,
      createdAt: issuance.created_at,
      updatedAt: new Date( issuance.updated_at ).toLocaleString(),
      idno: issuance.idno,
      date: issuance.date,
      issuingCompleted: issuingCompleted,
    } )
  }
} )


function onClickCreateReceiveButton ( event: Event ) { router.push( '/wms/issuances/create' ); }



async function onClickGenerateIssuanceForPrintButton ( event: Event ) {
  // Get selected rows
  const selectedRows: IssuanceRead[] = gridOptions.api.getSelectedRows()

  // Check if any row is selected
  if ( selectedRows.length === 0 ) {
    message.info( '請選擇發料單' );
    return false;
  }

  // Get selected row
  const issuance: IssuanceRead = selectedRows[ 0 ];

  // Open a new window to show a HTML page for printing for a selected issuance
  let routerData = router.resolve( `/wms/issuances/${ issuance.idno }/print` );
  window.open( routerData.href, '_blank' );
}



function onClickPickButton ( event: Event ) {
  // Get selected rows
  const selectedRows: Row[] = gridOptions.api.getSelectedRows()

  // Check if any row is selected
  if ( selectedRows.length === 0 ) {
    message.info( '請選擇發料單' );
    return false;
  }

  // Get selected row
  const issuance: Row = selectedRows[ 0 ];

  router.push( `/wms/issuances/${ issuance.idno }/pick` );
}
</script>


<template>
  <main
    style="min-height: calc(100vh - 60px); background-color: hsla(0, 0%, 92%, 1.0); background-repeat: repeat-x; background-position: center; background-size: cover;">
    <n-breadcrumb
      style="padding: 1rem; box-shadow: 0px 4px 20px -4px hsla(0, 0%, 60%, 0.4); position: relative; background-color: white; z-index: 1; overflow: auto;">
      <n-breadcrumb-item>
        <router-link to="/wms/home" #=" { navigate, href } " custom>
          <n-a :href=" href " @click=" navigate ">首頁</n-a>
        </router-link>
      </n-breadcrumb-item>
      <n-breadcrumb-item>收發作業</n-breadcrumb-item>
      <n-breadcrumb-item>發料備料作業</n-breadcrumb-item>
    </n-breadcrumb>

    <div style="padding: 1rem;">
      <n-h1 prefix="bar" style="font-size: 1.4rem;">發料備料作業</n-h1>
      <n-space vertical size="large"
        style="background-color: white; padding: 1rem; box-shadow: 0px 4px 20px -4px hsla(0, 0%, 60%, 0.4)">

        <n-space size="large" style="">

          <n-button type="primary" @click=" onClickCreateReceiveButton( $event ) ">建立發料單</n-button>

          <n-tooltip>
            <template #trigger>
              <n-button strong secondary type="primary"
                @click=" onClickGenerateIssuanceForPrintButton( $event ) ">產生紙本備料單
              </n-button>
            </template>
            請不要讓瀏覽器封鎖新視窗
          </n-tooltip>

          <n-button strong secondary type="primary" @click=" onClickPickButton( $event ) ">備料</n-button>

        </n-space>

        <ag-grid-vue class="ag-theme-alpine" :rowData=" rowData " style="height: 400px; " :gridOptions=" gridOptions ">
        </ag-grid-vue>

      </n-space>
    </div>
  </main>
</template>



<style>
main {
  background-image: url('/pattern.svg');
}
</style>
