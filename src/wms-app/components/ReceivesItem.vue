<script setup lang="ts">
import { ColDef, GetRowIdParams, GridOptions, GridReadyEvent } from "ag-grid-community"
import "ag-grid-community/styles/ag-grid.css" // Core grid CSS, always needed
import "ag-grid-community/styles/ag-theme-alpine.css" // Optional theme CSS
import { AgGridVue } from "ag-grid-vue3" // the AG Grid Vue Component
import { FormInst, NA, NBreadcrumb, NBreadcrumbItem, NButton, NDivider, NForm, NFormItemGi, NGi, NGrid, NH1, NH2, NInput, NInputGroup, NSelect, NSpace, useMessage } from 'naive-ui'
import { onBeforeMount, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ApiError, MaterialsService, OpenAPI, ReceiveItemCreate, ReceiveRead, ReceivesService, VendorsService } from '../../client'
import { useAuthStore } from '../../stores/auth'

const message = useMessage();
const router = useRouter();
const route = useRoute();

const authStore = useAuthStore();
OpenAPI.TOKEN = JSON.parse( authStore.accountToken )[ 'access_token' ];

const gridApi = ref();
const gridColumnApi = ref();

const formRef = ref<FormInst | null>( null );
const receiveForm = ref<ReceiveRead>( {
  idno: route.params.idno.toString(),
  vendor_id: 0,
  date: '',
  employee_id: 0,
  purchase_idno: '',
  vendor_shipping_idno: '',
  id: 0,
  vendor_idno: '',
  vendor_name: '',
  receive_items: [],
} );

type GridReceiveItem = ReceiveItemCreate & {
  id: number
  material_idno: string;
  material_name: string | undefined;
};
const rowData = ref<GridReceiveItem[]>( [] );
const columnDefs: ColDef[] = [
  { field: "material_idno", headerName: '物料代碼', editable: false },
  { field: "material_name", headerName: '物料名稱', editable: false },
  { field: "total_qty", headerName: '來料數量' },
  { field: "qualify_qty", headerName: '驗收數量' },
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

type VendorIdnoOptions = {
  label: string; // vendor_idno
  value: number; // vendor_id
};

type VendorNameOptions = {
  label: string; // vendor_name
  value: number; // vendor_id
};

const vendor_idno_options = ref<VendorIdnoOptions[]>( [] );
const vendor_name_options = ref<VendorNameOptions[]>( [] );

onBeforeMount( async () => {
  try {
    receiveForm.value = await ReceivesService.getReceive( { receiveIdno: route.params.idno.toString() } );
    if ( receiveForm.value.receive_items.length >= 1 ) {
      for ( let item of receiveForm.value.receive_items ) {
        const material = await MaterialsService.getMaterial( { idno: item.material_idno } );
        const gridItem: GridReceiveItem = {
          id: material.id, // ag-grid row ID
          material_id: material.id,
          material_idno: material.idno,
          material_name: material.name,
          total_qty: item.total_qty,
          qualify_qty: item.qualify_qty,
        };
        addReceiveItemToGrid( gridItem );
      }
    }
  } catch ( error ) { if ( error instanceof ApiError && error.status === 404 ) { router.push( '/http-status/404' ); } }

  try {
    const vendors = await VendorsService.getVendors();
    for ( let vendor of vendors ) {
      vendor_idno_options.value.push( { label: vendor.idno, value: vendor.id, } );
      vendor_name_options.value.push( { label: vendor.name, value: vendor.id, } );
    }
  } catch ( error ) { message.error( '無法取得供應商' ); }
} )

function getRowId ( params: GetRowIdParams ) { return params.data.id; }

async function onGridReady ( params: GridReadyEvent ) {
  gridApi.value = params.api;
  gridColumnApi.value = params.columnApi;
};

let newRowId = -1
function addReceiveItemToGrid ( receiveItem: GridReceiveItem ) {
  rowData.value.unshift( {
    id: newRowId,
    material_id: receiveItem.material_id,
    material_idno: receiveItem.material_idno,
    material_name: receiveItem.material_name,
    total_qty: receiveItem.total_qty,
    qualify_qty: receiveItem.qualify_qty,
  } );
  gridApi.value.setRowData( rowData.value );
  newRowId--;
}


async function handleUpdateReceiveButtonClick ( event: Event ) {
  try {
    const response = await ReceivesService.updateReceive( { receiveIdno: receiveForm.value.idno, memo: receiveForm.value.memo as string } );
    message.success( `收料單 ${ response.idno } 更新成功` );
    router.push( '/wms/receives' );
  } catch ( error ) { message.error( '更新失敗' ); }
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
      <n-breadcrumb-item>
        <router-link to="/wms/receives" #=" { navigate, href } " custom>
          <n-a :href=" href " @click=" navigate ">收料作業</n-a>
        </router-link>
      </n-breadcrumb-item>
      <n-breadcrumb-item>{{ $route.params.idno.toString().toUpperCase() }}</n-breadcrumb-item>
    </n-breadcrumb>

    <div style="padding: 1rem;">
      <n-h1 prefix="bar" style="font-size: 1.4rem;">收料單 {{ $route.params.idno.toString().toUpperCase() }}</n-h1>
      <n-space vertical size="large"
        style="background-color: white; padding: 1rem; box-shadow: 0px 4px 20px -4px hsla(0, 0%, 60%, 0.4)">

        <n-form size="large" :model=" receiveForm " ref="formRef">
          <n-grid cols="1 s:3" responsive="screen" x-gap="20">

            <n-form-item-gi label="舊 ERP 收料單號">
              <n-input-group>

                <n-input v-model:value.st_recieve_idno=" receiveForm.st_receive_idno " disabled placeholder="">
                </n-input>

              </n-input-group>
            </n-form-item-gi>

            <n-form-item-gi label="舊 ERP 隨車交貨單號">
              <n-input v-model:value.st_mbr_idno=" receiveForm.st_mbr_idno " disabled placeholder=""></n-input>
            </n-form-item-gi>

            <n-gi span="3">
              <n-divider />
            </n-gi>

            <n-form-item-gi show-require-mark label="供應商">
              <n-input-group>

                <n-select v-model:value.lazy=" receiveForm.vendor_id " :options=" vendor_idno_options " filterable
                  disabled :fallback-option=" false " placeholder="供應商代號"></n-select>

                <n-select v-model:value.lazy=" receiveForm.vendor_id " :options=" vendor_name_options " filterable
                  disabled :fallback-option=" false " placeholder="供應商名稱"></n-select>

              </n-input-group>
            </n-form-item-gi>

            <n-form-item-gi label="供應商出貨單號">
              <n-input v-model:value.vendor_shipping_idno=" receiveForm.vendor_shipping_idno " disabled placeholder="">
              </n-input>
            </n-form-item-gi>

            <n-form-item-gi label="內部採購單號">
              <n-input v-model:value.purchase_idno=" receiveForm.purchase_idno " disabled placeholder=""></n-input>
            </n-form-item-gi>

            <n-form-item-gi label="備註" span="3">
              <n-input v-model:value.memo=" receiveForm.memo "></n-input>
            </n-form-item-gi>

            <n-gi span="3">
              <n-divider />
            </n-gi>

            <n-gi span="3">

              <n-h2 style="font-size: 1.2rem; margin-bottom: unset;">物料</n-h2>

              <ag-grid-vue class="ag-theme-alpine" :rowData=" rowData " style="height: 400px; "
                :gridOptions=" gridOptions " :getRowId=" getRowId " :onGridReady=" onGridReady "></ag-grid-vue>
            </n-gi>

            <n-form-item-gi span="3">
              <n-button type="primary" block @click=" handleUpdateReceiveButtonClick( $event ) " attr-type="submit">
                更新收料單
              </n-button>
            </n-form-item-gi>

          </n-grid>
        </n-form>
      </n-space>
    </div>
  </main>
</template>
