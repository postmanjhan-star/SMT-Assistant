<script setup lang="ts">
import { GetRowIdParams, GridReadyEvent, RowDoubleClickedEvent } from "ag-grid-community";
import "ag-grid-community/dist/styles/ag-grid.css"; // Core grid CSS, always needed
import "ag-grid-community/dist/styles/ag-theme-alpine.css"; // Optional theme CSS
import { AgGridVue } from "ag-grid-vue3"; // the AG Grid Vue Component
import { NA, NBreadcrumb, NBreadcrumbItem, NButton, NH1, NSpace, NTooltip, useMessage } from 'naive-ui';
import { onBeforeMount, reactive, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { OpenAPI, ReceiveRead, ReceivesService } from '../client';
import { useAuthStore } from '../stores/auth';

const message = useMessage();
const router = useRouter();

const authStore = useAuthStore();
OpenAPI.TOKEN = JSON.parse( authStore.accountToken )[ 'access_token' ];

const gridApi = ref();
const gridColumnApi = ref();

const rowData = ref<ReceiveRead[]>( [] );

const defaultColDef = {
  filter: true,
  sortable: true,
  flex: 1,
  resizable: true,
}

const columnDefs = reactive( {
  value: [
    { field: "idno", headerName: '收料單號' },
    { field: "vendor_idno", headerName: '供應商代號' },
    { field: "vendor_name", headerName: '供應商名稱' },
    { field: "st_receive_idno", headerName: '舊 ERP 收料單號' },
    { field: "st_mbr_idno", headerName: '舊 ERP 隨車交貨單號' },
  ]
} );

const gridOptions = {
  columnDefs: columnDefs.value,
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
  onRowDoubleClicked: ( event: RowDoubleClickedEvent ) => router.push( `/receives/${ event.data.idno }` ),
}

onBeforeMount( async () => { rowData.value = await ReceivesService.getRecentReceives(); } );

function getRowId ( params: GetRowIdParams ) { return params.data.id; }

function onGridReady ( params: GridReadyEvent ) {
  gridApi.value = params.api;
  gridColumnApi.value = params.columnApi;
};

function handleCreateReceiveButtonClick () { router.push( '/receives/create' ); }

async function handleGenerateLabelsButtonClick () {
  let receive: ReceiveRead;

  // Get selected row
  const selectedRows: ReceiveRead[] = gridApi.value.getSelectedRows();

  // Check if a row is selected
  if ( selectedRows.length === 0 ) {
    message.info( '請選擇收料單' );
    return false;
  }

  // check if the row has a ST ERP receive_idno
  receive = selectedRows[ 0 ];
  for ( let receive_item of receive.receive_items ) {
    // Direct to PDF URL
    const url = `/api/receives/${ receive.idno }/${ receive_item.id }/labels`;
    window.open( url, '_blank' );
  }
}


// async function handleGenerateStErpLabelsButtonClick () {
//   let receive: ReceiveRead;

//   // Get selected row
//   const selectedRows: ReceiveRead[] = gridApi.value.getSelectedRows();

//   // Check if a row is selected
//   if ( selectedRows.length === 0 ) {
//     message.info( '請選擇 ERP 收料單' );
//     return false;
//   }

//   // check if the row has a ST ERP receive_idno
//   receive = selectedRows[ 0 ];
//   if ( receive.st_receive_idno === null ) {
//     message.warning( '此收料單非舊 ERP 收料單' );
//     return false;
//   }

//   // Fetch PDF and download. Does not work. PDF gets no content, all empty.
//   // const pdf: Blob = await StErpService.printStReceivePacksLabel( receive.st_receive_idno as string, Printer.PLAYWRIGHT );
//   // const blob = new Blob( [ pdf ], { type: 'application/pdf' } )
//   // const fileAnchor = document.createElement( 'a' );
//   // fileAnchor.href = URL.createObjectURL( blob );
//   // fileAnchor.setAttribute( 'download', 'sample.pdf' );
//   // fileAnchor.click();
//   // URL.revokeObjectURL( fileAnchor.href );

//   // Direct to PDF URL
//   const url = `/api/st_erp/receives/${ receive.st_receive_idno }/packs_label`
//   // window.location.href = url;
//   window.open( url );
// }
</script>


<template>
  <main
    style="min-height: calc(100vh - 60px); background-color: hsla(0, 0%, 92%, 1.0); background-image: url('/pattern.svg'); background-repeat: repeat-x; background-position: center; background-size: cover;">
    <n-breadcrumb
      style="padding: 1rem; box-shadow: 0px 4px 20px -4px hsla(0, 0%, 60%, 0.4); position: relative; background-color: white; z-index: 1; overflow: auto;">
      <n-breadcrumb-item>
        <router-link to="/home" #=" { navigate, href } " custom>
          <n-a :href=" href " @click=" navigate ">首頁</n-a>
        </router-link>
      </n-breadcrumb-item>
      <n-breadcrumb-item>物料管理</n-breadcrumb-item>
      <n-breadcrumb-item>收料作業</n-breadcrumb-item>
    </n-breadcrumb>

    <div style="padding: 1rem;">
      <n-h1 prefix="bar" style="font-size: 1.4rem;">收料作業</n-h1>
      <n-space vertical size="large"
        style="background-color: white; padding: 1rem; box-shadow: 0px 4px 20px -4px hsla(0, 0%, 60%, 0.4)">

        <n-space size="large" style="">

          <n-button type="primary" @click=" handleCreateReceiveButtonClick ">建立收料單</n-button>

          <n-tooltip>
            <template #trigger>
              <n-button @click=" handleGenerateLabelsButtonClick ">產生 WMS 標籤貼紙</n-button>
            </template>
            請不要讓瀏覽器封鎖新視窗
          </n-tooltip>

          <!-- <n-button @click=" handleGenerateStErpLabelsButtonClick ">產生舊 ERP 標籤貼紙</n-button> -->

        </n-space>

        <ag-grid-vue class="ag-theme-alpine" :rowData=" rowData " style="height: 400px; " :gridOptions=" gridOptions "
          :getRowId=" getRowId " :onGridReady=" onGridReady ">
        </ag-grid-vue>

      </n-space>
    </div>
  </main>
</template>
