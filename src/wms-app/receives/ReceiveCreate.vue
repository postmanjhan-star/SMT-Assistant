<script setup lang="ts">
import { GetRowIdParams, GridOptions, GridReadyEvent } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css"; // Core grid CSS, always needed
import "ag-grid-community/styles/ag-theme-alpine.css"; // Optional theme CSS
import { AgGridVue } from "ag-grid-vue3"; // the AG Grid Vue Component
import { FormInst, NA, NBreadcrumb, NBreadcrumbItem, NButton, NDivider, NForm, NFormItem, NFormItemGi, NGi, NGrid, NH1, NH2, NInput, NInputGroup, NInputNumber, NSelect, NSpace, SelectOption, useMessage } from 'naive-ui';
import { onBeforeMount, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { ApiError, MaterialsService, OpenAPI, ReceiveCreate, ReceiveItemCreate, ReceivesService, VendorsService } from '../../client';
import { useAuthStore } from '../../stores/auth';

const message = useMessage();
const router = useRouter()
const props = defineProps( {
  st_receive_idno: String,
  st_vendor_id: Number,
  st_mbr_idno: String,
  st_purchase_idno: String,
  material_idno: String,
  total_qty: Number,
  qualify_qty: Number,
  st_barcodes: Array<string>,
} );

const authStore = useAuthStore();
OpenAPI.TOKEN = JSON.parse( authStore.accountToken )[ 'access_token' ];

const gridApi = ref();
const gridColumnApi = ref();

const formRef = ref<FormInst | null>( null );
const headerFormValue = ref( {
  vendor_id: props.st_vendor_id as number,
  vendor_shipping_idno: undefined,
  purchase_idno: props.st_purchase_idno,
  memo: undefined,
  st_receive_idno: props.st_receive_idno as string,
  st_mbr_idno: props.st_mbr_idno,
} );

const materialIdnoInput = ref();

type GridReceiveItem = ReceiveItemCreate & {
  id: number
  material_idno: string;
  material_name: string | undefined;
};

const materialAdditionFormValue = ref<GridReceiveItem>( {
  id: 1, // ag-grid row ID
  material_id: 1,
  material_idno: '',
  material_name: '',
  total_qty: 0,
  qualify_qty: 0,
} )

const rowData = ref<GridReceiveItem[]>( [] );

const gridOptions: GridOptions = {
  // GRID OPTIONS
  // Column Definitions
  columnDefs: [
    { field: "material_idno", headerName: '物料代碼', editable: false },
    { field: "material_name", headerName: '物料名稱', editable: false },
    { field: "total_qty", headerName: '來料數量' },
    { field: "qualify_qty", headerName: '驗收數量' },
  ],
  defaultColDef: { editable: true, filter: true, sortable: true, resizable: true },

  // Editing
  stopEditingWhenCellsLoseFocus: true,
  enterMovesDownAfterEdit: true,
  undoRedoCellEditing: true,

  // Miscellaneous
  debug: false,

  // Pagination
  pagination: true,

  // Rendering
  suppressColumnVirtualisation: true,

  // RowModel
  getRowId: ( params: GetRowIdParams ) => { return params.data.id },

  // Scrolling
  debounceVerticalScrollbar: false,

  // Selection
  enableCellTextSelection: true,
  rowSelection: 'single',
  suppressCellFocus: true,

  // Styling
  suppressRowTransform: true,
}

const vendor_idno_options = ref<SelectOption[]>( [] );
const vendor_name_options = ref<SelectOption[]>( [] );

onBeforeMount( async () => {
  try {
    const vendors = await VendorsService.getVendors()
    for ( let vendor of vendors ) {
      vendor_idno_options.value.push( { label: vendor.idno, value: vendor.id, } )
      vendor_name_options.value.push( { label: vendor.name, value: vendor.id, } )
    }
  } catch ( error ) { message.error( '無法取得供應商清單' ) }
} )

async function onGridReady ( params: GridReadyEvent ) {
  gridApi.value = params.api;
  gridColumnApi.value = params.columnApi;

  if ( props.material_idno && props.total_qty && props.qualify_qty ) {
    const material = await MaterialsService.getMaterial( { idno: props.material_idno } );
    const gridItem: GridReceiveItem = {
      id: 1, // ag-grid row ID
      material_id: material.id,
      material_idno: material.idno,
      material_name: material.name,
      total_qty: props.total_qty,
      qualify_qty: props.qualify_qty,
      st_barcodes: props.st_barcodes,
    };
    addReceiveItemToGrid( gridItem );
  }
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
    st_barcodes: receiveItem.st_barcodes,
  } );
  gridApi.value.setRowData( rowData.value );
  gridColumnApi.value.autoSizeAllColumns();
  newRowId--;
}

async function onClickAddReceiveItemButton ( event: Event ) {
  // qualify_qty and total_qty should greater than zero
  if ( materialAdditionFormValue.value.qualify_qty as number <= 0 || materialAdditionFormValue.value.total_qty as number <= 0 ) {
    message.error( '數量應大於零' );
    return false;
  }

  // Check if qualify_qty less or equeal to total_qty
  if ( materialAdditionFormValue.value.qualify_qty as number > ( materialAdditionFormValue.value.total_qty as number ) ) {
    message.error( '驗收數量不可大於來料數量' );
    return false;
  }

  // `material_idno` cannot be empty
  if ( materialAdditionFormValue.value.material_idno === '' ) {
    message.error( '請填入物料代碼' );
    return false;
  }

  // Check if the material exists
  // Handle 404 and other errors
  try {
    const material = await MaterialsService.getMaterial( { idno: materialAdditionFormValue.value.material_idno } );
    materialAdditionFormValue.value.material_id = material.id;
    materialAdditionFormValue.value.material_name = material.name;
  } catch ( error ) {
    if ( error instanceof ApiError && error.status === 404 ) {
      message.error( '無此物料' );
      return false;
    }
    else {
      message.error( '物料讀取失敗' );
      return false;
    }
  }

  // Add the material into the grid
  addReceiveItemToGrid( materialAdditionFormValue.value );

  // Clear materialAdditionFormValue
  materialAdditionFormValue.value.id = 1;
  materialAdditionFormValue.value.material_idno = '';
  materialAdditionFormValue.value.material_name = '';
  materialAdditionFormValue.value.total_qty = 0;
  materialAdditionFormValue.value.qualify_qty = 0;

  // Focus at `material_idno` input field
  materialIdnoInput.value.focus();
}


const loadingRef = ref( false );
const loading = loadingRef;

async function onClickCreateReceiveButton ( event: Event ) {
  loadingRef.value = true;

  // Build request body
  const submitValue: ReceiveCreate = {
    vendor_id: headerFormValue.value.vendor_id,
    vendor_shipping_idno: headerFormValue.value.vendor_shipping_idno,
    purchase_idno: headerFormValue.value.purchase_idno,
    memo: headerFormValue.value.memo,
    st_receive_idno: headerFormValue.value.st_receive_idno,
    st_mbr_idno: headerFormValue.value.st_mbr_idno,
    receive_items: rowData.value,
  };

  // Create
  try {
    const response = await ReceivesService.createReceive( { requestBody: submitValue } );
    message.success( `收料單 ${ response.idno } 建立成功` );
    router.push( '/wms/receives' );
  }
  catch ( error ) {
    if ( error instanceof ApiError && error.status === 409 ) { message.error( '此張舊 ERP 收料單已匯入過，不可重複匯入。' ); }
    else { message.error( '建立失敗' ); }
  }
  finally { loadingRef.value = false; }
}
</script>


<template>
  <main
    style="min-height: calc(100vh - 60px); background-color: hsla(0, 0%, 92%, 1.0); background-repeat: repeat-x; background-position: center; background-size: cover;">
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
      <n-breadcrumb-item>建立收料單</n-breadcrumb-item>
    </n-breadcrumb>

    <div style="padding: 1rem;">
      <n-h1 prefix="bar" style="font-size: 1.4rem;">建立收料單</n-h1>
      <n-space vertical size="large"
        style="background-color: white; padding: 1rem; box-shadow: 0px 4px 20px -4px hsla(0, 0%, 60%, 0.4)">

        <n-form size="large" :model=" headerFormValue " ref="formRef">
          <n-grid cols="1 s:3" responsive="screen" x-gap="20">

            <n-form-item-gi label="舊 ERP 收料單號" path="st_recieve_idno">
              <n-input-group>
                <n-input v-model:value.lazy=" headerFormValue.st_receive_idno "></n-input>
              </n-input-group>
            </n-form-item-gi>

            <n-form-item-gi label="舊 ERP 隨車交貨單號">
              <n-input v-model:value.lazy=" headerFormValue.st_mbr_idno "></n-input>
            </n-form-item-gi>

            <n-gi span="3">
              <n-divider />
            </n-gi>

            <n-form-item-gi show-require-mark label="供應商">
              <n-input-group>

                <n-select v-model:value.lazy=" headerFormValue.vendor_id " :options=" vendor_idno_options " filterable
                  :fallback-option=" false " placeholder="供應商代號" :input-props=" { id: 'vendor-idno-input' } "></n-select>

                <n-select v-model:value.lazy=" headerFormValue.vendor_id " :options=" vendor_name_options " filterable
                  :fallback-option=" false " placeholder="供應商名稱" :input-props=" { id: 'vendor-name-input' } "></n-select>

              </n-input-group>
            </n-form-item-gi>

            <n-form-item-gi label="供應商出貨單號">
              <n-input v-model:value.lazy=" headerFormValue.vendor_shipping_idno "></n-input>
            </n-form-item-gi>

            <n-form-item-gi label="內部採購單號">
              <n-input v-model:value.lazy=" headerFormValue.purchase_idno "></n-input>
            </n-form-item-gi>

            <n-form-item-gi label="備註" span="3">
              <n-input v-model:value.lazy=" headerFormValue.memo "></n-input>
            </n-form-item-gi>

            <n-gi span="3">
              <n-divider />
            </n-gi>

            <n-gi span="3">

              <n-h2 style="font-size: 1.2rem; margin-bottom: unset;">物料</n-h2>

              <n-form size="large" :model=" materialAdditionFormValue ">
                <n-space size="large" style="margin-bottom: 1rem; margin-top: 0.4rem;">

                  <n-form-item label="物料代碼">
                    <n-input v-model:value.lazy=" materialAdditionFormValue.material_idno "
                      ref="materialIdnoInput" :input-props=" { id: 'material_idno' } "></n-input>
                  </n-form-item>

                  <n-form-item label="來料數量">
                    <n-input-number v-model:value.lazy=" materialAdditionFormValue.total_qty " :show-button=" false "
                      :min=" 0 " :precision=" 4 " :default-value=" 0 " id="total_qty"></n-input-number>
                  </n-form-item>

                  <n-form-item label="驗收數量">
                    <n-input-number v-model:value.lazy=" materialAdditionFormValue.qualify_qty " :show-button=" false "
                      :min=" 0 " :precision=" 4 " :default-value=" 0 " id="qualify_qty"></n-input-number>
                  </n-form-item>

                  <n-form-item>
                    <n-button type="primary" secondary strong @click=" onClickAddReceiveItemButton( $event ) "
                      attr-type="submit">增加物料</n-button>
                  </n-form-item>

                </n-space>
              </n-form>

              <div style="height: 600px; overflow-x: scroll; width: 100%;">
                <ag-grid-vue class="ag-theme-alpine" :rowData=" rowData " style="height: 100%; "
                  :gridOptions=" gridOptions " :onGridReady=" onGridReady ">
                </ag-grid-vue>
              </div>

            </n-gi>

            <n-form-item-gi span="3">
              <n-button type="primary" block @click=" onClickCreateReceiveButton( $event ) " attr-type="submit"
                :loading=" loading ">
                建立收料單
              </n-button>
            </n-form-item-gi>

          </n-grid>
        </n-form>
      </n-space>
    </div>
  </main>
</template>



<style>
main {
  background-image: url('/pattern.svg');
}
</style>
