<script setup lang="ts">
import { ColDef, GetRowIdParams, GridOptions, GridReadyEvent, IDatasource, IGetRowsParams, RowDoubleClickedEvent } from "ag-grid-community";
import "ag-grid-community/dist/styles/ag-grid.css"; // Core grid CSS, always needed
import "ag-grid-community/dist/styles/ag-theme-alpine.css"; // Optional theme CSS
import { AgGridVue } from "ag-grid-vue3"; // the AG Grid Vue Component
import { NA, NBreadcrumb, NBreadcrumbItem, NButton, NH1, NSpace, NTooltip, useMessage } from 'naive-ui';
import { ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { ApiError, MaterialRead, MaterialsService, OpenAPI, ReceiveRead, ReceivesService, StErpService, STReceiveHeader, VendorRead, VendorsService } from '../client';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const message = useMessage();

const authStore = useAuthStore();
OpenAPI.TOKEN = JSON.parse( authStore.accountToken )[ 'access_token' ];

const gridApi = ref();
const gridColumnApi = ref();

const pageRows = 15;

const defaultColDef = {
  editable: false,
  filter: true,
  sortable: true,
  flex: 1, // Every columns have the same portion of width
  resizable: true,
}

const columnDefs: ColDef[] = [
  { field: "idno", headerName: '舊 ERP 收料單號' },
  { field: "st_vendor_idno", headerName: '供應商代碼' },
  { field: "st_part_idno", headerName: '物料代碼' },
  { field: "total_qty", headerName: '來料數量' },
  { field: "qualify_qty", headerName: '驗收數量' },
  { field: "st_mbr_idno", headerName: '舊 ERP 隨車交貨單號' },
  { field: "st_purchase_idno", headerName: '內部採購單號' },
]

const gridOptions: GridOptions = {
  columnDefs: columnDefs,
  defaultColDef: defaultColDef,
  stopEditingWhenCellsLoseFocus: true,
  enterMovesDownAfterEdit: true,
  undoRedoCellEditing: true,
  debug: false,
  pagination: true,
  paginationPageSize: 15,
  suppressColumnVirtualisation: true,
  suppressRowTransform: true,
  debounceVerticalScrollbar: true,
  enableCellTextSelection: true,

  rowModelType: 'infinite',
  cacheBlockSize: pageRows,

  rowSelection: 'single',
  suppressCellFocus: true,
  onRowDoubleClicked: ( event: RowDoubleClickedEvent ) => { },
}


function getRowId ( params: GetRowIdParams ) { return params.data.idno; }


async function onGridReady ( params: GridReadyEvent ) {
  gridApi.value = params.api;
  gridColumnApi.value = params.columnApi;

  const dataSource: IDatasource = {
    getRows: async ( params: IGetRowsParams ) => {
      let page = params.endRow / pageRows;
      let response = await StErpService.getStReceives( page );
      params.successCallback( response );
    }
  }
  params.api.setDatasource( dataSource );
}


const loadingRef = ref( false );
const loading = loadingRef;

async function handleCreateReceiveButtonClick () {
  loadingRef.value = true;

  let stReceive: STReceiveHeader;
  let vendor: VendorRead;
  let material: MaterialRead;
  let receive: ReceiveRead;
  let barcodes: string[] = [];

  // Get selected row
  const selectedRows: STReceiveHeader[] = gridApi.value.getSelectedRows();
  if ( selectedRows.length === 0 ) {
    message.warning( '請選擇舊 ERP 收料單' );
    loadingRef.value = false;
    return false;
  } else { stReceive = selectedRows[ 0 ]; }

  // Only allow qualify_qty > 0
  if ( stReceive.qualify_qty <= 0 ) {
    message.warning( '驗收數量為零，請驗收後重試' );
    loadingRef.value = false;
    return false;
  }

  // Check if vendor and material exist in WMS
  try {
    vendor = await VendorsService.getVendor( stReceive.st_vendor_idno )
    material = await MaterialsService.getMaterial( stReceive.st_part_idno );
  } catch ( error ) {
    if ( error instanceof ApiError && error.status === 404 ) {
      message.error( '請先建立 WMS 供應商與物料主檔' );
      loadingRef.value = false;
      return false;
    }
    else {
      message.error( '建立失敗' );
      loadingRef.value = false;
      return false;
    }
  }

  // If the ST receive idno is already in WMS receive idno, stop importing.
  receive = await ReceivesService.getReceive( stReceive.idno );
  if ( receive ) {
    message.error( '此收料單已匯入過，不可重複匯入' );
    loadingRef.value = false;
    return false;
  }

  // Get ST ERP packs barcode from ST ERP receive idno
  try { barcodes = await StErpService.getStReceivePackBarcodes( stReceive.idno ); } catch ( error ) { }

  // Disable button unless a row has been selected

  // Send props to /receives/create
  router.push( {
    name: `receivesCreate`,
    params: {
      st_receive_idno: stReceive.idno,
      st_record_idno: stReceive.st_erp_record_idno,
      st_mbr_idno: stReceive.st_mbr_idno,
      st_vendor_id: vendor.id,
      st_purchase_idno: stReceive.st_purchase_idno,
      material_idno: material.idno,
      total_qty: stReceive.total_qty,
      qualify_qty: stReceive.qualify_qty,
      st_barcodes: barcodes,
    }
  } );
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
      <n-breadcrumb-item>舊 ERP 收料紀錄</n-breadcrumb-item>
    </n-breadcrumb>

    <div style="padding: 1rem;">
      <n-h1 prefix="bar" style="font-size: 1.4rem;">舊 ERP 收料紀錄</n-h1>
      <n-space vertical size="large"
        style="background-color: white; padding: 1rem; box-shadow: 0px 4px 20px -4px hsla(0, 0%, 60%, 0.4)">

        <n-tooltip>
          <template #trigger>
            <n-button type="primary" @click=" handleCreateReceiveButtonClick " :loading=" loading ">從舊 ERP 收料單建立 WMS 收料單
            </n-button>
          </template>
          建立 WMS 收料單前務必先建立 WMS 之「供應商主檔」與「物料主檔」
        </n-tooltip>

        <ag-grid-vue class="ag-theme-alpine" style="height: 400px; " :gridOptions=" gridOptions " :getRowId=" getRowId "
          :onGridReady=" onGridReady "></ag-grid-vue>

      </n-space>
    </div>
  </main>
</template>
