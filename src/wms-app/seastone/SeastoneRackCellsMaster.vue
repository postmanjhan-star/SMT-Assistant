<script setup lang="ts">
import { GetRowIdParams, GridOptions, RowDataUpdatedEvent, RowDoubleClickedEvent, RowNode, ViewportChangedEvent } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css"; // Core grid CSS, always needed
import "ag-grid-community/styles/ag-theme-alpine.css"; // Optional theme CSS
import { AgGridVue } from "ag-grid-vue3"; // the AG Grid Vue Component
import { NButton, NSpace } from 'naive-ui';
import { onBeforeMount, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { OpenAPI, ReceiveRead, SeastoneService, SeastoneSmartRackCellRead } from '../../client/index';
import { useAuthStore } from '../../stores/auth';

const route = useRoute();
const router = useRouter();

const authStore = useAuthStore();
OpenAPI.TOKEN = JSON.parse( authStore.accountToken )[ 'access_token' ];

const rowData = ref<SeastoneSmartRackCellRead[]>( [] );

const gridOptions: GridOptions = {
  // PROPERTIES
  // Column Definitions
  columnDefs: [
    { field: "side", headerName: '面向', refData: { 0: '正面', 1: '背面' } },
    { field: "cell_idno", headerName: '槽位代碼' },
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
  onRowDoubleClicked: ( event: RowDoubleClickedEvent ) => { },
}

onBeforeMount( async () => {
  const rack = await SeastoneService.getSeastoneSmartRack( { rackIdno: route.params.rack_idno.toString() } )
  rowData.value = rack.seastone_smart_rack_cells
} )

function onClickCreateCellButton ( event: Event ) { router.push( `/wms/seastone_racks/${ route.params.rack_idno.toString() }/create_cell` ) }
</script>



<template>

  <n-space vertical size="large" style="background-color: white; box-shadow: 0px 4px 20px -4px hsla(0, 0%, 60%, 0.4)">

    <n-space size="large">
      <n-button type="primary" @click=" onClickCreateCellButton( $event ) ">建立槽位</n-button>
    </n-space>

    <div style="height: 400px;">
      <ag-grid-vue class="ag-theme-alpine" :rowData=" rowData " style="height: 100%; " :gridOptions=" gridOptions ">
      </ag-grid-vue>
    </div>

  </n-space>

</template>
