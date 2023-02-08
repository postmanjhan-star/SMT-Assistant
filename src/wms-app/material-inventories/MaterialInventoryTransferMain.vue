<script setup lang="ts">
import { ColDef, GetRowIdParams, GridOptions, GridReadyEvent, RowDoubleClickedEvent } from "ag-grid-community"
import "ag-grid-community/styles/ag-grid.css" // Core grid CSS, always needed
import "ag-grid-community/styles/ag-theme-alpine.css" // Optional theme CSS
import { AgGridVue } from "ag-grid-vue3" // the AG Grid Vue Component
import { CascaderOption, NA, NBreadcrumb, NBreadcrumbItem, NButton, NCascader, NForm, NFormItem, NH1, NInput, NSpace, useMessage, useNotification } from 'naive-ui'
import { onBeforeMount, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { ApiError, InventoryChangeCauseEnum, MaterialInventoriesService, MaterialInventoryRead, MaterialInventoryTransferCreate, OpenAPI, StoragesService, StorageTypeEnum } from '../../client'
import { useAuthStore } from '../../stores/auth'

const router = useRouter();
const message = useMessage();
const notification = useNotification();

const authStore = useAuthStore();
OpenAPI.TOKEN = JSON.parse( authStore.accountToken )[ 'access_token' ];

const materialInventoryIdnoInput = ref();
const materialInventoryAdditionFormValue = ref( { idno: '' } );

const rowData = ref<MaterialInventoryRead[]>( [] );

let storageOptions = ref<CascaderOption[]>( [] );

const storageValue = ref( null );

const gridApi = ref();
const gridColumnApi = ref();

const defaultColDef: ColDef = {
  editable: false,
  filter: true,
  sortable: true,
  resizable: true,
}

const columnDefs: ColDef[] = [
  { field: "idno", headerName: '單包代碼' },
  { field: "st_barcode", headerName: '舊 ERP 單包代碼' },
  { field: "material_idno", headerName: '物料代碼' },
]

const gridOptions: GridOptions = {
  columnDefs: columnDefs,
  defaultColDef: defaultColDef,
  stopEditingWhenCellsLoseFocus: true,
  enterMovesDownAfterEdit: true,
  undoRedoCellEditing: true,
  debug: false,
  pagination: true,
  paginationPageSize: 15,
  suppressColumnVirtualisation: true,
  suppressRowTransform: true,
  debounceVerticalScrollbar: false,
  enableCellTextSelection: true,

  rowModelType: 'clientSide',

  rowSelection: 'single',
  suppressCellFocus: true,
  onRowDoubleClicked: ( event: RowDoubleClickedEvent ) => { },
}


function getRowId ( params: GetRowIdParams ) { return params.data.idno; }



onBeforeMount( async () => {
  const storages = await StoragesService.getStorages();
  for ( let storage of storages ) {
    const storageOption: CascaderOption = {
      label: storage.idno,
      value: storage.idno,
      children: [],
    };

    for ( let l2_storage of storage.l2_storages ) {
      storageOption.children?.push( {
        label: l2_storage.idno,
        value: l2_storage.id,
      } )
    }

    storageOptions.value.push( storageOption );
  }
} );



async function onGridReady ( params: GridReadyEvent ) {
  gridApi.value = params.api;
  gridColumnApi.value = params.columnApi;
}



function addItemToGrid ( item: MaterialInventoryRead ) {
  rowData.value.unshift( item );
  gridApi.value.setRowData( rowData.value );
  gridColumnApi.value.autoSizeAllColumns();
}



function clearMaterialInventoryAdditionFormAndFocus () {
  materialInventoryAdditionFormValue.value.idno = '';
  materialInventoryIdnoInput.value.focus();
}



async function onClickAddMaterialInventoryButton ( event: Event ) {
  // `idno` cannot be empty
  if ( materialInventoryAdditionFormValue.value.idno === '' ) {
    message.info( '請填入單包代碼' );
    return false;
  }

  // Check duplication
  for ( let row of rowData.value ) {
    // By material inventory's idno
    if ( materialInventoryAdditionFormValue.value.idno.trim() === row.idno ) {
      message.info( '此單包已加入' );
      clearMaterialInventoryAdditionFormAndFocus();
      return false;
    }

    // By material inventory's ST barcode
    if ( materialInventoryAdditionFormValue.value.idno.trim() === row.st_barcode ) {
      message.info( '此單包已加入' );
      clearMaterialInventoryAdditionFormAndFocus();
      return false;
    }
  }

  // Check if the material inventory exists
  // Handle 404 and other errors
  let materialInventory: MaterialInventoryRead;
  try { materialInventory = await MaterialInventoriesService.getMaterialInventory( { materialInventoryIdno: materialInventoryAdditionFormValue.value.idno } ); }
  catch ( error ) {
    if ( error instanceof ApiError && error.status === 404 ) {
      message.error( '無此單包代碼' );
      clearMaterialInventoryAdditionFormAndFocus();
      return false;
    }
    else {
      message.error( '資料驗證失敗' );
      clearMaterialInventoryAdditionFormAndFocus();
      return false;
    }
  }

  // Check if the inventory is in warehouse
  const inventoryStorage = await StoragesService.getStorage( { l1Id: materialInventory.l1_storage_id as number } );

  if ( inventoryStorage.type != StorageTypeEnum.INTERNAL_WAREHOUSE ) {
    message.error( '此包不在庫內不可調撥' );
    clearMaterialInventoryAdditionFormAndFocus();
    return false;
  }

  // Add the material into the grid
  addItemToGrid( materialInventory );

  // Clear materialAdditionFormValue
  clearMaterialInventoryAdditionFormAndFocus();
}



async function onClickMakeTransferButton ( event: Event ) {
  // Check if ag-grid is empty
  if ( rowData.value.length === 0 ) {
    message.info( '請輸入單包代碼' );
    clearMaterialInventoryAdditionFormAndFocus();
    return false;
  }

  // Check if storage is null
  if ( storageValue.value === null ) {
    message.info( '請選擇儲位' );
    return false;
  }

  // Transfer
  const successList: String[] = [];
  const errorList: String[] = [];
  for ( let row of rowData.value ) {

    // If source and target are the same, skip to next row.
    if ( row.l2_storage_id === storageValue.value ) {
      successList.push( row.idno );
      continue;
    }

    // Send transfer request
    const balance = await MaterialInventoriesService.getMaterialInventoryInStockBalance( { materialInventoryId: row.id } );
    const transferRequests: MaterialInventoryTransferCreate[] = [ {
      to_l2_storage_id: storageValue.value,
      quantity: balance,
      major: true,
    } ]
    try {
      await MaterialInventoriesService.transferMaterialInventory( {
        materialInventoryId: row.id,
        fromL2StorageId: row.l2_storage_id as number,
        cause: InventoryChangeCauseEnum.TRANSFERRING,
        checkSourceBalance: true,
        requestBody: transferRequests,
      } );
      successList.push( row.idno );
    } catch ( error ) { errorList.push( row.idno ); };
  }

  // Show results
  if ( errorList.length > 0 ) {
    notification.error( {
      title: '調撥失敗',
      content: `以下物件調撥失敗：\n${ errorList.join( '\n' ) }`,
    } );
  }

  if ( successList.length > 0 ) {
    notification.success( {
      title: '調撥成功',
      content: `以下物件調撥成功：\n${ successList.join( '\n' ) }`,
      duration: 10000,
    } )
  }

  // Clear all fields
  rowData.value = [];
  storageValue.value = null;
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
      <n-breadcrumb-item>調撥作業</n-breadcrumb-item>
    </n-breadcrumb>

    <div style="padding: 1rem;">
      <n-h1 prefix="bar" style="font-size: 1.4rem;">調撥作業</n-h1>

      <n-space vertical size="large"
        style="background-color: white; padding: 1rem; box-shadow: 0px 4px 20px -4px hsla(0, 0%, 60%, 0.4)">

        <n-form size="large" :model=" materialInventoryAdditionFormValue ">
          <n-space size="large">

            <n-form-item label="單包代碼">
              <!-- inputmode need to be dynamic controled by a button -->
              <n-input v-model:value.lazy=" materialInventoryAdditionFormValue.idno "
                ref="materialInventoryIdnoInput" autofocus clearable :input-props=" { inputmode: 'none' } "></n-input>
            </n-form-item>

            <n-form-item>
              <n-button type="primary" secondary strong @click=" onClickAddMaterialInventoryButton( $event ) "
                attr-type="submit">+</n-button>
            </n-form-item>

          </n-space>
        </n-form>

        <div style="height: 400px; overflow-x: scroll; width: 100%;">
          <ag-grid-vue class="ag-theme-alpine" style="height: 100%;" :gridOptions=" gridOptions " :getRowId=" getRowId "
            :onGridReady=" onGridReady " :rowData=" rowData "></ag-grid-vue>
        </div>

        <n-form size="large">
          <n-form-item label="目的儲位">
            <n-cascader expand-trigger="hover" check-strategy="child" :show-path=" true " :filterable=" true "
              size="large" v-model:value=" storageValue " :options=" storageOptions ">
            </n-cascader>
          </n-form-item>

          <n-form-item>
            <n-button type="primary" @click=" onClickMakeTransferButton( $event ) " attr-type="submit" block
              size="large">調撥</n-button>
          </n-form-item>

        </n-form>

      </n-space>
    </div>
  </main>
</template>
