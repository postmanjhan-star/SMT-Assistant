<script setup lang="ts">
import { GetRowIdParams, GridApi, ColumnApi, GridReadyEvent, RowDoubleClickedEvent } from "ag-grid-community";
import "ag-grid-community/dist/styles/ag-grid.css"; // Core grid CSS, always needed
import "ag-grid-community/dist/styles/ag-theme-alpine.css"; // Optional theme CSS
import { AgGridVue } from "ag-grid-vue3"; // the AG Grid Vue Component
import { NA, NBreadcrumb, NBreadcrumbItem, NButton, NH1, NSpace } from 'naive-ui';
import { onBeforeMount, reactive, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { MaterialRead, MaterialsService, MaterialTypeEnum, OpenAPI } from '../client';
import { useAuthStore } from '../stores/auth';

const router = useRouter();

const authStore = useAuthStore();
OpenAPI.TOKEN = JSON.parse( authStore.accountToken )[ 'access_token' ];

const gridApi = ref<GridApi>();
const gridColumnApi = ref<ColumnApi>();

const rowData = ref<MaterialRead[]>( [] );

const defaultColDef = {
  editable: false,
  filter: true,
  sortable: true,
  resizable: true,
}

const columnDefs = reactive( {
  value: [
    { field: "idno", headerName: '物料代碼' },
    { field: "name", headerName: '物料名稱' },
    { field: "material_type", headerName: '物料類別', refData: { RAW_MATERIAL: '❹ 原料', PRODUCT: '❶ 成品' } },
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
  onRowDoubleClicked: ( event: RowDoubleClickedEvent ) => {
    switch ( event.data.material_type ) {
      case MaterialTypeEnum.RAW_MATERIAL:
        router.push( `/materials/${ event.data.idno }` );
        break;
      case MaterialTypeEnum.PRODUCT:
        router.push( `/materials/${ event.data.idno }` );
        break;
    }
  },
}



onBeforeMount( async () => {
  rowData.value = await MaterialsService.getMaterials();
  gridApi.value.setRowData( rowData.value );
  gridColumnApi.value.autoSizeAllColumns();
} );



function getRowId ( params: GetRowIdParams ) { return params.data.id; }



function onGridReady ( params: GridReadyEvent ) {
  gridApi.value = params.api;
  gridColumnApi.value = params.columnApi;
};



function onClickCreateRawMaterialButton () { router.push( '/materials/create_raw_material' ); }



function onClickCreateProductButton () { router.push( '/materials/create_product' ); }
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
      <n-breadcrumb-item>物料管理</n-breadcrumb-item>
    </n-breadcrumb>

    <div style="padding: 1rem;">
      <n-h1 prefix="bar" style="font-size: 1.4rem;">物料管理</n-h1>
      <n-space vertical size="large"
        style="background-color: white; padding: 1rem; box-shadow: 0px 4px 20px -4px hsla(0, 0%, 60%, 0.4)">

        <n-space size="large">

          <n-button type="primary" size="large" @click=" onClickCreateRawMaterialButton( $event ) ">建立原料 ❹</n-button>

          <n-button type="primary" size="large" @click=" onClickCreateProductButton( $event ) ">建立成品 ❶</n-button>
        
        </n-space>

        <div style="height: 600px; overflow-x: scroll; width: 100%;">
          <ag-grid-vue class="ag-theme-alpine" :rowData=" rowData " style="height: 100%; " :gridOptions=" gridOptions "
            :getRowId=" getRowId " :onGridReady=" onGridReady "></ag-grid-vue>
        </div>


      </n-space>
    </div>

  </main>
</template>
