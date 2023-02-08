<script setup lang="ts">
import { GetRowIdParams, GridOptions, RowDataUpdatedEvent, RowDoubleClickedEvent, RowNode, ViewportChangedEvent } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css"; // Core grid CSS, always needed
import "ag-grid-community/styles/ag-theme-alpine.css"; // Optional theme CSS
import { AgGridVue } from "ag-grid-vue3"; // the AG Grid Vue Component
import { NA, NBreadcrumb, NBreadcrumbItem, NButton, NH1, NSpace } from 'naive-ui';
import { onBeforeMount, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { OpenAPI, ReceiveRead, SeastoneService, SeastoneSmartRackReadWithoutChildren } from '../../client/index';
import { useAuthStore } from '../../stores/auth';

const router = useRouter();

const authStore = useAuthStore();
OpenAPI.TOKEN = JSON.parse( authStore.accountToken )[ 'access_token' ];

const rowData = ref<SeastoneSmartRackReadWithoutChildren[]>( [] );

const gridOptions: GridOptions = {
  // PROPERTIES
  // Column Definitions
  columnDefs: [
    { field: "server_address", headerName: '服務主機位址' },
    { field: "rack_idno", headerName: '料架代碼' },
    { field: "wifi_ip", headerName: 'Wi-Fi IP 位址' },
    { field: "wifi_mac", headerName: 'Wi-Fi MAC 位址' },
    { field: "eth_ip", headerName: '有線 IP 位址' },
    { field: "eth_mac", headerName: '有線 MAC 位址' },
    { field: "dev_id", headerName: '料架序號' },
  ],
  defaultColDef: { filter: true, sortable: true, resizable: true },

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
  getBusinessKeyForNode: ( node: RowNode<ReceiveRead> ) => { return node.data.id.toString() },

  // RowModel
  rowModelType: 'clientSide',
  getRowId: ( params: GetRowIdParams ) => { return params.data.id },

  // Scrolling
  debounceVerticalScrollbar: false,

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
  onRowDoubleClicked: ( event: RowDoubleClickedEvent ) => router.push( `/wms/seastone_racks/${ event.data.rack_idno }` ),
}

onBeforeMount( async () => { rowData.value = await SeastoneService.getGetSeastoneSmartRackList() } )

function onClickCreateRackButton () { router.push( '/wms/seastone_racks/create' ) }
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
      <n-breadcrumb-item>系統管理</n-breadcrumb-item>
      <n-breadcrumb-item>智慧料架管理</n-breadcrumb-item>
    </n-breadcrumb>

    <div style="padding: 1rem;">
      <n-h1 prefix="bar" style="font-size: 1.4rem;">智慧料架管理</n-h1>
      <n-space vertical size="large"
        style="background-color: white; padding: 1rem; box-shadow: 0px 4px 20px -4px hsla(0, 0%, 60%, 0.4)">

        <n-space size="large" style="">
          <n-button type="primary" @click=" onClickCreateRackButton ">建立料架</n-button>
        </n-space>

        <div style="height: 400px;">
          <ag-grid-vue class="ag-theme-alpine" :rowData=" rowData " style="height: 100%; " :gridOptions=" gridOptions ">
          </ag-grid-vue>
        </div>

      </n-space>
    </div>
  </main>
</template>
