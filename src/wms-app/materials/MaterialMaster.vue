<script setup lang="ts">
import { GetRowIdParams, RowDoubleClickedEvent, GridOptions, RowNode, ViewportChangedEvent, RowDataUpdatedEvent } from "ag-grid-community"
import "ag-grid-community/styles/ag-grid.css" // Core grid CSS, always needed
import "ag-grid-community/styles/ag-theme-alpine.css" // Optional theme CSS
import { AgGridVue } from "ag-grid-vue3" // the AG Grid Vue Component
import { NA, NBreadcrumb, NBreadcrumbItem, NButton, NH1, NSpace } from 'naive-ui'
import { onBeforeMount, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { MaterialRead, MaterialsService, MaterialTypeEnum, OpenAPI } from '../../client'
import { useAuthStore } from '../../stores/auth'

const router = useRouter();

const authStore = useAuthStore();
OpenAPI.TOKEN = JSON.parse( authStore.accountToken )[ 'access_token' ];

const rowData = ref<MaterialRead[]>( [] );


const gridOptions: GridOptions = {
  // PROPERTIES
  // Column Definitions
  columnDefs: [
    { field: "idno", headerName: '物料代碼' },
    { field: "name", headerName: '物料名稱' },
    { field: "material_type", headerName: '物料類別', refData: { RAW_MATERIAL: '❹ 原料', PRODUCT: '❶ 成品', IN_PROCESS_MATERIAL: '❷ 半成品' } },
  ],
  defaultColDef: { editable: false, filter: true, sortable: true, resizable: true },

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
  getBusinessKeyForNode: ( node: RowNode<MaterialRead> ) => { return node.data.id.toString() },

  // RowModel
  rowModelType: 'clientSide',
  getRowId: ( params: GetRowIdParams ) => { return params.data.id },

  // Scrolling
  debounceVerticalScrollbar: false, // 打開會讓卷軸棒慢半拍

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
  onRowDoubleClicked: ( event: RowDoubleClickedEvent ) => {
    switch ( event.data.material_type ) {
      case MaterialTypeEnum.RAW_MATERIAL:
        router.push( `/wms/materials/${ event.data.idno }` )
        break
      case MaterialTypeEnum.PRODUCT:
        router.push( `/wms/materials/${ event.data.idno }` )
        break
      case MaterialTypeEnum.IN_PROCESS_MATERIAL:
        router.push( `/wms/materials/${ event.data.idno }` )
        break
    }
  },
}


onBeforeMount( async () => {
  rowData.value = await MaterialsService.getMaterials();
  gridOptions.api.setRowData( rowData.value );
} );


function onClickCreateProductButton ( event: Event ) { router.push( '/wms/materials/create_product' ) }
function onClickCreateInProcessMaterialButton ( event: Event ) { router.push( '/wms/materials/create_in_process_material' ) }
function onClickCreateRawMaterialButton ( event: Event ) { router.push( '/wms/materials/create_raw_material' ) }
function onClickBatchButton( event: Event ) { router.push('/wms/materials/batch-create') }
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
      <n-breadcrumb-item>物料管理</n-breadcrumb-item>
    </n-breadcrumb>

    <div style="padding: 1rem;">
      <n-h1 prefix="bar" style="font-size: 1.4rem;">物料管理</n-h1>
      <n-space vertical size="large"
        style="background-color: white; padding: 1rem; box-shadow: 0px 4px 20px -4px hsla(0, 0%, 60%, 0.4)">

        <n-space size="large">
          <n-button size="large" strong secondary type="primary" @click=" onClickCreateProductButton( $event ) ">建立成品 ❶</n-button>
          <n-button size="large" strong secondary type="primary" @click=" onClickCreateInProcessMaterialButton( $event ) ">建立半成品 ❷</n-button>
          <n-button size="large" strong secondary type="primary" @click=" onClickCreateRawMaterialButton( $event ) ">建立原料 ❹</n-button>
          <n-button size="large" strong secondary type="primary" @click=" onClickBatchButton( $event ) ">批次建立物料</n-button>
        </n-space>

        <div style="height: 600px; overflow-x: scroll; width: 100%;">
          <ag-grid-vue class="ag-theme-alpine" :rowData=" rowData " style="height: 100%; "
            :gridOptions=" gridOptions "></ag-grid-vue>
        </div>


      </n-space>
    </div>

  </main>
</template>
