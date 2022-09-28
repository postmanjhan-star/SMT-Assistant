<script setup lang="ts">
import { GetRowIdParams, GridReadyEvent, RowDoubleClickedEvent } from "ag-grid-community";
import "ag-grid-community/dist/styles/ag-grid.css"; // Core grid CSS, always needed
import "ag-grid-community/dist/styles/ag-theme-alpine.css"; // Optional theme CSS
import { AgGridVue } from "ag-grid-vue3"; // the AG Grid Vue Component
import { NA, NBreadcrumb, NBreadcrumbItem, NButton, NH1, NSpace } from 'naive-ui';
import { onBeforeMount, reactive, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { VendorRead, VendorsService, OpenAPI } from '../client';
import { useAuthStore } from '../stores/auth';

const router = useRouter();

const authStore = useAuthStore();
OpenAPI.TOKEN = JSON.parse( authStore.accountToken )[ 'access_token' ];

const gridApi = ref();
const gridColumnApi = ref();

const rowData = ref<VendorRead[]>( [] );

const defaultColDef = {
  filter: true,
  sortable: true,
  flex: 1,
  resizable: true,
}

const columnDefs = reactive( {
  value: [
    { field: "idno", headerName: '供應商代碼' },
    { field: "name", headerName: '供應商名稱' },
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

  rowSelection: 'single',
  suppressCellFocus: true,
  onRowDoubleClicked: ( event: RowDoubleClickedEvent ) => router.push( `/vendors/${ event.data.idno }` ),
}

onBeforeMount( async () => {
  rowData.value = await VendorsService.getVendors();
} );

function getRowId ( params: GetRowIdParams ) { return params.data.id; }

function onGridReady ( params: GridReadyEvent ) {
  gridApi.value = params.api;
  gridColumnApi.value = params.columnApi;
};

function handleCreateStoreageButtonClick () { router.push( '/vendors/create' ); }
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
      <n-breadcrumb-item>基本資料管理</n-breadcrumb-item>
      <n-breadcrumb-item>供應商管理</n-breadcrumb-item>
    </n-breadcrumb>

    <div style="padding: 1rem;">
      <n-h1 prefix="bar" style="font-size: 1.4rem;">供應商管理</n-h1>
      <n-space vertical size="large"
        style="background-color: white; padding: 1rem; box-shadow: 0px 4px 20px -4px hsla(0, 0%, 60%, 0.4)">
        <n-button type="primary" @click=" handleCreateStoreageButtonClick ">建立供應商</n-button>

        <ag-grid-vue class="ag-theme-alpine" :rowData=" rowData " style="height: 400px; " :gridOptions=" gridOptions "
          :getRowId=" getRowId " :onGridReady=" onGridReady ">
        </ag-grid-vue>

      </n-space>
    </div>

  </main>
</template>
