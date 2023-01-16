<script setup lang="ts">
import { ColDef, GetRowIdParams, GridOptions, GridReadyEvent, RowDoubleClickedEvent } from "ag-grid-community"
import "ag-grid-community/styles/ag-grid.css" // Core grid CSS, always needed
import "ag-grid-community/styles/ag-theme-alpine.css" // Optional theme CSS
import { AgGridVue } from "ag-grid-vue3" // the AG Grid Vue Component
import { NA, NBreadcrumb, NBreadcrumbItem, NH1, NSpace } from 'naive-ui'
import { onBeforeMount, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { EpicorReceive, EpicorService, OpenAPI } from '../../client'
import { useAuthStore } from '../../stores/auth'

const router = useRouter();

const authStore = useAuthStore();
OpenAPI.TOKEN = JSON.parse( authStore.accountToken )[ 'access_token' ];

const gridApi = ref();
const gridColumnApi = ref();

const rowData = ref<EpicorReceive[]>( [] );

const defaultColDef: ColDef = {
  filter: true,
  sortable: true,
  flex: 1,
  resizable: true,
}

const columnDefs: ColDef[] = [
  { field: "ReceiptDate", headerName: '收貨日期' },
  { field: "PackSlip", headerName: '包裝單' },
  { field: "PONum", headerName: 'PO' },
  { field: "VendorNumName", headerName: '供應商名稱' },
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

  rowSelection: 'single',
  suppressCellFocus: true,
  onRowDoubleClicked: ( event: RowDoubleClickedEvent ) => router.push( `/wms/epicor_receives/${ event.data.VendorNum }/${ event.data.PackSlip }` ),
}

onBeforeMount( async () => { rowData.value = await EpicorService.getEpicorReceives(); } );

function getRowId ( params: GetRowIdParams ) { return params.data.SysRevID; }

function onGridReady ( params: GridReadyEvent ) {
  gridApi.value = params.api;
  gridColumnApi.value = params.columnApi;
};
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
      <n-breadcrumb-item>Epicore 收料紀錄</n-breadcrumb-item>
    </n-breadcrumb>

    <div style="padding: 1rem;">
      <n-h1 prefix="bar" style="font-size: 1.4rem;">Epicore 收料紀錄</n-h1>
      <n-space vertical size="large"
        style="background-color: white; padding: 1rem; box-shadow: 0px 4px 20px -4px hsla(0, 0%, 60%, 0.4)">

        <ag-grid-vue class="ag-theme-alpine" :rowData=" rowData " style="height: 400px; " :gridOptions=" gridOptions "
          :getRowId=" getRowId " :onGridReady=" onGridReady ">
        </ag-grid-vue>

      </n-space>
    </div>

  </main>
</template>
