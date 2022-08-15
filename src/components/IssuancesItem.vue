<script setup lang="ts">
import { ColDef, GetRowIdParams, GridOptions, GridReadyEvent } from "ag-grid-community";
import "ag-grid-community/dist/styles/ag-grid.css"; // Core grid CSS, always needed
import "ag-grid-community/dist/styles/ag-theme-alpine.css"; // Optional theme CSS
import { AgGridVue } from "ag-grid-vue3"; // the AG Grid Vue Component
import { FormInst, NA, NBreadcrumb, NBreadcrumbItem, NButton, NForm, NFormItemGi, NGi, NGrid, NH1, NInput, NSpace, useMessage } from 'naive-ui';
import { onBeforeMount, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { IssuanceItemRead, IssuanceRead, IssuancesService, IssuanceUpdate, MaterialInventoriesService, OpenAPI } from '../client';
import { useAuthStore } from '../stores/auth';

const message = useMessage();
const router = useRouter();
const route = useRoute();

const authStore = useAuthStore();
OpenAPI.TOKEN = JSON.parse( authStore.accountToken )[ 'access_token' ];

const gridApi = ref();
const gridColumnApi = ref();

const formRef = ref<FormInst | null>( null );
const headerFormValue = ref( {
  memo: '',
} );

type GridItem = {
  material_idno: string,
  material_inventory_id: number,
  material_inventory_idno: string,
  issue_qty: number,
  lend_qty: number,
};

const rowData = ref<GridItem[]>( [] );
const columnDefs: ColDef[] = [
  { field: "material_idno", headerName: '物料代碼', editable: false },
  { field: "material_inventory_idno", headerName: '單包代碼', editable: false },
  { field: "issue_qty", headerName: '發出數量' },
  { field: "lend_qty", headerName: '借出數量' },
];

const defaultColDef = {
  editable: true,
  filter: true,
  sortable: true,
  flex: 1, // Every columns have the same portion of width
  resizable: true,
}

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

onBeforeMount( async () => {
  const issuance = await IssuancesService.getIssuance( route.params.idno.toString() );
  headerFormValue.value.memo = issuance.memo;
  console.debug( issuance );
  for ( let issuanceItem of issuance.issuance_items as IssuanceItemRead[] ) {
    const materialInventory = await MaterialInventoriesService.getMaterialInventory( issuanceItem.material_invnetory_idno );
    rowData.value.push( {
      material_idno: materialInventory.material_idno,
      material_inventory_id: materialInventory.id,
      material_inventory_idno: materialInventory.idno,
      issue_qty: issuanceItem.issue_qty,
      lend_qty: issuanceItem.lend_qty,
    } )
  }
  gridApi.value.setRowData( rowData.value );
} );

function getRowId ( params: GetRowIdParams ) { return params.data.material_inventory_id; }

async function onGridReady ( params: GridReadyEvent ) {
  gridApi.value = params.api;
  gridColumnApi.value = params.columnApi;
};


const loadingRef = ref( false );
const loading = loadingRef;

async function handleUpdateIssuanceButtonClick ( event: Event ) {
  loadingRef.value = true;

  // Build issuance body
  const issuanceUpdate: IssuanceUpdate = { memo: headerFormValue.value.memo };

  // Create issuance
  let issuance: IssuanceRead;
  try { issuance = await IssuancesService.updateIssuance( route.params.idno.toString(), issuanceUpdate ); }
  catch ( error ) {
    message.error( '更新失敗' );
    loadingRef.value = false;
    return false;
  }

  message.success( `發料單 ${ issuance.idno } 更新成功` );
  router.push( '/issuances' );
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
      <n-breadcrumb-item>
        <router-link to="/issuances" #=" { navigate, href } " custom>
          <n-a :href=" href " @click=" navigate ">發料備料作業</n-a>
        </router-link>
      </n-breadcrumb-item>
      <n-breadcrumb-item>{{ $route.params.idno.toString().toUpperCase() }}</n-breadcrumb-item>
    </n-breadcrumb>

    <div style="padding: 1rem;">
      <n-h1 prefix="bar" style="font-size: 1.4rem;">發料單 {{ $route.params.idno.toString().toUpperCase() }}</n-h1>
      <n-space vertical size="large"
        style="background-color: white; padding: 1rem; box-shadow: 0px 4px 20px -4px hsla(0, 0%, 60%, 0.4)">

        <n-form size="large" :model=" headerFormValue " ref="formRef">
          <n-grid cols="1 s:3" responsive="screen" x-gap="20">

            <n-form-item-gi label="備註" span="3">
              <n-input v-model:value.memo=" headerFormValue.memo "></n-input>
            </n-form-item-gi>

            <n-gi span="3">

              <n-space size="large" style="margin-bottom: 1rem;"></n-space>

              <ag-grid-vue class="ag-theme-alpine" :rowData=" rowData " style="height: 400px; "
                :gridOptions=" gridOptions " :getRowId=" getRowId " :onGridReady=" onGridReady ">
              </ag-grid-vue>
            </n-gi>

            <n-form-item-gi span="3">
              <n-button type="primary" block @click=" handleUpdateIssuanceButtonClick( $event ) " attr-type="submit"
                :loading=" loading ">
                更新發料單
              </n-button>
            </n-form-item-gi>

          </n-grid>
        </n-form>
      </n-space>
    </div>
  </main>
</template>
