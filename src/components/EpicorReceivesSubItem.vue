<script setup lang="ts">
import "ag-grid-community/dist/styles/ag-grid.css"; // Core grid CSS, always needed
import "ag-grid-community/dist/styles/ag-theme-alpine.css"; // Optional theme CSS
import { AgGridVue } from "ag-grid-vue3"; // the AG Grid Vue Component
import { NH2, NSpace, useMessage } from 'naive-ui';
import { onBeforeMount, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { EpicorReceiveDetail, EpicorService, OpenAPI } from '../client';
import { useAuthStore } from '../stores/auth';

const message = useMessage();

const authStore = useAuthStore();
OpenAPI.TOKEN = JSON.parse( authStore.accountToken )[ 'access_token' ];

const route = useRoute();
const router = useRouter();

const rowData = ref<EpicorReceiveDetail[] | undefined>( [] );

const gridApi = ref();
const gridColumnApi = ref();

const defaultColDef = {
  filter: true,
  sortable: true,
  flex: 1,
  resizable: true,
}

const columnDefs = reactive( {
  value: [
    { field: "PartNum", headerName: '零件' },
    { field: "WareHouseCode", headerName: '倉庫' },
    { field: "BinNum", headerName: '庫位' },
    { field: "OurQty", headerName: '我方數量' },
    { field: "IUM", headerName: '單位' },
    { field: "ReceivedTo", headerName: '收貨至' },
    { field: "VenPartNum", headerName: '供應商零件' },
    { field: "LotNum", headerName: '批號' },
    { field: "NumLabels", headerName: '行' },
    { field: "ReceivedQty", headerName: '我方數量' },
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
}

onBeforeMount( async () => {
  try {
    const response = await EpicorService.getEpicorReceive( { vendorNum: parseInt( route.params.vendor_num.toString() ), packSlip: route.params.pack_slip.toString() } );
    rowData.value = response.ReceiveDetails;
  } catch ( error ) {
    console.error( error );
  }
} )

function getRowId ( params ) { return params.data.id; }

function onGridReady ( params ) {
  gridApi.value = params.api;
  gridColumnApi.value = params.columnApi;
};
</script>

<template>
  <div style="padding: 1rem;">
    <n-space size="large" item-style="height: 40px; vertical-align: center" :align=" 'center' ">
      <n-h2 style="font-size: 1.2rem; margin-bottom: unset;">Epicor 零件</n-h2>
    </n-space>

    <n-space vertical size="large"
      style="background-color: white; padding: 1rem; box-shadow: 0px 4px 20px -4px hsla(0, 0%, 60%, 0.4)">

      <ag-grid-vue class="ag-theme-alpine" :rowData=" rowData " style="height: 400px; " :gridOptions=" gridOptions "
        :getRowId=" getRowId " :onGridReady=" onGridReady ">
      </ag-grid-vue>

    </n-space>
  </div>
</template>

<style>
</style>
