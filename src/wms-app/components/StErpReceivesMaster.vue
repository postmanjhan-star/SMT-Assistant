<script setup lang="ts">
import { ColDef, GetRowIdParams, GridOptions, GridReadyEvent } from "ag-grid-community";
import "ag-grid-community/dist/styles/ag-grid.css"; // Core grid CSS, always needed
import "ag-grid-community/dist/styles/ag-theme-alpine.css"; // Optional theme CSS
import { AgGridVue } from "ag-grid-vue3"; // the AG Grid Vue Component
import { format, fromUnixTime, getTime } from 'date-fns';
import { NA, NBreadcrumb, NBreadcrumbItem, NButton, NDivider, NH1, NSpace, NTooltip, useMessage } from 'naive-ui';
import { ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { ApiError, MaterialRead, MaterialsService, OpenAPI, ReceiveRead, ReceivesService, StErpService, STReceiveHeader, VendorRead, VendorsService } from '../../client';
import { useAuthStore } from '../../stores/auth';



const router = useRouter();
const message = useMessage();

const authStore = useAuthStore();
OpenAPI.TOKEN = JSON.parse( authStore.accountToken )[ 'access_token' ];

const gridApi = ref();
const gridColumnApi = ref();

const dateForm = ref( { dateTimestamp: getTime( new Date() ) } );

type Row = {
  idno: string,
  stVendorIdno: string,
  stPartIdno: string,
  totalQty: number,
  qualifyQty: number,
  stMbrIdno: string,
  stPurchaseIdno: string,
}

const rowData = ref<Row[]>( [] );


const defaultColDef: ColDef = {
  editable: false,
  filter: true,
  sortable: true,
  resizable: true,
}

const columnDefs: ColDef[] = [
  { field: "idno", headerName: '舊 ERP 收料單號' },
  { field: "stVendorIdno", headerName: '供應商代碼' },
  { field: "stPartIdno", headerName: '物料代碼' },
  { field: "totalQty", headerName: '來料數量' },
  { field: "qualifyQty", headerName: '驗收數量' },
  { field: "stMbrIdno", headerName: '舊 ERP 隨車交貨單號' },
  { field: "stPurchaseIdno", headerName: '內部採購單號' },
]

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

  rowSelection: 'single',
  suppressCellFocus: true,
}



function getRowId ( params: GetRowIdParams ) { return params.data.idno; }

async function updateReceiveList ( date: Date ) {
  let receiveList: STReceiveHeader[];
  try { receiveList = await StErpService.getStReceiveList( { stReceiveDate: format( date, 'yyyy-MM-dd' ) } ); }
  catch ( error ) {
    message.warning( '無資料' );
    return false;
  }
  rowData.value = []
  for ( let receive of receiveList ) {
    rowData.value.push( {
      idno: receive.idno,
      stVendorIdno: receive.st_vendor_idno,
      stPartIdno: receive.st_part_idno,
      totalQty: receive.total_qty,
      qualifyQty: receive.qualify_qty,
      stMbrIdno: receive.st_mbr_idno,
      stPurchaseIdno: receive.st_purchase_idno,
    } )
  }
  gridApi.value.setRowData( rowData.value );
  gridColumnApi.value.autoSizeAllColumns();
}

async function onGridReady ( params: GridReadyEvent ) {
  gridApi.value = params.api;
  gridColumnApi.value = params.columnApi;
  await updateReceiveList( new Date() );
}


async function onSubmitDateQuery ( event: Event ) {
  const dateTime = fromUnixTime( dateForm.value.dateTimestamp / 1000 );
  await updateReceiveList( dateTime );
}


const loadingRef = ref( false );
const loading = loadingRef;



async function onClickCreateReceiveButton ( event: Event ) {
  loadingRef.value = true;

  let stReceive: Row;
  let vendor: VendorRead;
  let material: MaterialRead;
  let receive: ReceiveRead | null;
  let barcodes: string[] = [];

  // Get selected row
  const selectedRows: Row[] = gridApi.value.getSelectedRows();
  if ( selectedRows.length === 0 ) {
    message.warning( '請選擇舊 ERP 收料單' );
    loadingRef.value = false;
    return false;
  } else { stReceive = selectedRows[ 0 ]; }

  // Only allow qualify_qty > 0
  if ( stReceive.qualifyQty <= 0 ) {
    message.warning( '驗收數量為零，請驗收後重試' );
    loadingRef.value = false;
    return false;
  }

  // Check if vendor and material exist in WMS
  try {
    vendor = await VendorsService.getVendor( { idno: stReceive.stVendorIdno } );
    material = await MaterialsService.getMaterial( { idno: stReceive.stPartIdno } );
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
  try {
    receive = await ReceivesService.getReceive( { receiveIdno: stReceive.idno } );
  } catch ( error ) { receive = null; }

  if ( receive ) {
    message.error( '此收料單已匯入過，不可重複匯入' );
    loadingRef.value = false;
    return false;
  }

  // Get ST ERP packs barcode from ST ERP receive idno
  try { barcodes = await StErpService.getStReceivePackBarcodes( { stErpReceiveIdno: stReceive.idno } ); }
  catch ( error ) {
    message.error( '舊 ERP 條碼讀取失敗' );
    loadingRef.value = false;
    return false;
  }

  // Disable button unless a row has been selected

  // Send props to /wms/receives/create
  router.push( {
    name: `receivesCreate`,
    params: {
      st_receive_idno: stReceive.idno,
      st_mbr_idno: stReceive.stMbrIdno,
      st_vendor_id: vendor.id,
      st_purchase_idno: stReceive.stPurchaseIdno,
      material_idno: material.idno,
      total_qty: stReceive.totalQty,
      qualify_qty: stReceive.qualifyQty,
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
        <router-link to="/wms/home" #=" { navigate, href } " custom>
          <n-a :href=" href " @click=" navigate ">首頁</n-a>
        </router-link>
      </n-breadcrumb-item>
      <n-breadcrumb-item>收發作業</n-breadcrumb-item>
      <n-breadcrumb-item>舊 ERP 收料紀錄</n-breadcrumb-item>
    </n-breadcrumb>

    <div style="padding: 1rem;">
      <n-h1 prefix="bar" style="font-size: 1.4rem;">舊 ERP 收料紀錄</n-h1>
      <n-space vertical size="large"
        style="background-color: white; padding: 1rem; box-shadow: 0px 4px 20px -4px hsla(0, 0%, 60%, 0.4)">

        <n-space size="large">
          <n-tooltip>
            <template #trigger>
              <n-button type="primary" @click=" onClickCreateReceiveButton( $event ) " :loading=" loading ">
                從舊 ERP 收料單建立 WMS 收料單
              </n-button>
            </template>
            建立 WMS 收料單前務必先建立 WMS 之「供應商主檔」與「物料主檔」
          </n-tooltip>
        </n-space>

        <n-divider></n-divider>

        <n-form size="large" :model=" dateForm ">
          <n-grid cols="1 s:3">
            <n-form-item-gi label="日期">
              <n-space>
                <n-date-picker v-model:value.lazy=" dateForm.dateTimestamp " type="date" />
                <n-button type="primary" @click=" onSubmitDateQuery( $event ) " attr-type="submit">查詢
                </n-button>
              </n-space>
            </n-form-item-gi>
          </n-grid>
        </n-form>

        <div style="height: 600px; overflow-x: scroll; width: 100%;">
          <ag-grid-vue class="ag-theme-alpine" style="height: 100%; " :gridOptions=" gridOptions "
            :getRowId=" getRowId " :onGridReady=" onGridReady " :rowData=" rowData "></ag-grid-vue>
        </div>


      </n-space>
    </div>
  </main>
</template>
