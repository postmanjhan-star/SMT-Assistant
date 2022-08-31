<script setup lang="ts">
import { GetRowIdParams, GridReadyEvent, RowDoubleClickedEvent } from "ag-grid-community";
import "ag-grid-community/dist/styles/ag-grid.css"; // Core grid CSS, always needed
import "ag-grid-community/dist/styles/ag-theme-alpine.css"; // Optional theme CSS
import { AgGridVue } from "ag-grid-vue3"; // the AG Grid Vue Component
import { NA, NBreadcrumb, NBreadcrumbItem, NButton, NH1, NSpace, NTooltip, useMessage } from 'naive-ui';
import { onBeforeMount, reactive, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { IssuanceRead, IssuancesService, OpenAPI } from '../client';
import { useAuthStore } from '../stores/auth';



const message = useMessage();
const router = useRouter();

const authStore = useAuthStore();
OpenAPI.TOKEN = JSON.parse( authStore.accountToken )[ 'access_token' ];

const gridApi = ref();
const gridColumnApi = ref();

let issuances: IssuanceRead[];

type Row = {
  'id': number,
  'idno': string,
  'date': string,
  'issuingCompleted': string,
}

const rowData = ref<Row[]>( [] );

const defaultColDef = {
  filter: true,
  sortable: true,
  flex: 1,
  resizable: true,
}

const columnDefs = reactive( {
  value: [
    { field: "idno", headerName: '發料單號' },
    { field: "date", headerName: '日期' },
    { field: "issuingCompleted", headerName: '已發料完成' },
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
  onRowDoubleClicked: ( event: RowDoubleClickedEvent ) => router.push( `/issuances/${ event.data.idno }` ),
}



onBeforeMount( async () => {
  issuances = await IssuancesService.getIssuances();

  for ( let issuance of issuances ) {
    let issuingCompleted: string;
    issuance.issuing_completed ? issuingCompleted = '✅' : issuingCompleted = '';
    rowData.value.push( { id: issuance.id, idno: issuance.idno, date: issuance.date, issuingCompleted: issuingCompleted } );
  }
} );



function getRowId ( params: GetRowIdParams ) { return params.data.id; }



function onGridReady ( params: GridReadyEvent ) {
  gridApi.value = params.api;
  gridColumnApi.value = params.columnApi;
};



function handleCreateReceiveButtonClick () { router.push( '/issuances/create' ); }



async function handleGenerateIssuanceForPrintButtonClick () {
  // Get selected rows
  const selectedRows: IssuanceRead[] = gridApi.value.getSelectedRows();

  // Check if any row is selected
  if ( selectedRows.length === 0 ) {
    message.info( '請選擇發料單' );
    return false;
  }

  // Get selected row
  const issuance: IssuanceRead = selectedRows[ 0 ];

  // Open a new window to show a HTML page for printing for a selected issuance
  let routerData = router.resolve( `/issuances/${ issuance.idno }/print` );
  window.open( routerData.href, '_blank' );
}



function onClickPickButton ( event: Event ) {
  // Get selected rows
  const selectedRows: IssuanceRead[] = gridApi.value.getSelectedRows();

  // Check if any row is selected
  if ( selectedRows.length === 0 ) {
    message.info( '請選擇發料單' );
    return false;
  }

  // Get selected row
  const issuance: IssuanceRead = selectedRows[ 0 ];

  router.push( `/issuances/${ issuance.idno }/pick` );
}
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
      <n-breadcrumb-item>發料備料作業</n-breadcrumb-item>
    </n-breadcrumb>

    <div style="padding: 1rem;">
      <n-h1 prefix="bar" style="font-size: 1.4rem;">發料備料作業</n-h1>
      <n-space vertical size="large"
        style="background-color: white; padding: 1rem; box-shadow: 0px 4px 20px -4px hsla(0, 0%, 60%, 0.4)">

        <n-space size="large" style="">

          <n-button type="primary" @click=" handleCreateReceiveButtonClick ">建立發料單</n-button>

          <n-tooltip>
            <template #trigger>
              <n-button strong secondary type="primary" @click=" handleGenerateIssuanceForPrintButtonClick ">產生紙本備料單
              </n-button>
            </template>
            請不要讓瀏覽器封鎖新視窗
          </n-tooltip>

          <n-button strong secondary type="primary" @click=" onClickPickButton( $event ) ">備料</n-button>

        </n-space>

        <ag-grid-vue class="ag-theme-alpine" :rowData=" rowData " style="height: 400px; " :gridOptions=" gridOptions "
          :getRowId=" getRowId " :onGridReady=" onGridReady ">
        </ag-grid-vue>

      </n-space>
    </div>
  </main>
</template>
