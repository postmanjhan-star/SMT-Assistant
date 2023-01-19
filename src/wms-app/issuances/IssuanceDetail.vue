<script setup lang="ts">
import { GetRowIdParams, GridOptions } from "ag-grid-community"
import "ag-grid-community/styles/ag-grid.css" // Core grid CSS, always needed
import "ag-grid-community/styles/ag-theme-alpine.css" // Optional theme CSS
import { AgGridVue } from "ag-grid-vue3" // the AG Grid Vue Component
import { FormInst, NA, NBreadcrumb, NBreadcrumbItem, NButton, NForm, NFormItem, NFormItemGi, NGi, NGrid, NH1, NH2, NInput, NInputNumber, NSpace, NTag, useMessage } from 'naive-ui'
import { onBeforeMount, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ApiError, IssuanceItemRead, IssuanceRead, IssuancesService, IssuanceUpdate, MaterialInventoriesService, MaterialInventoryRead, OpenAPI, StoragesService, StorageTypeEnum } from '../../client'
import { useAuthStore } from '../../stores/auth'



const message = useMessage();
const router = useRouter();
const route = useRoute();

const authStore = useAuthStore();
OpenAPI.TOKEN = JSON.parse( authStore.accountToken )[ 'access_token' ];

const formRef = ref<FormInst | null>( null )
const headerFormValue = ref( {
  st_erp_work_order_idno: '',
  st_erp_work_order_date: null,
  st_erp_work_order_due_date: null,
  st_erp_product_idno: '',
  st_erp_product_due_quanity: null,
  st_erp_production_department: '',
  st_erp_production_line: '',
  memo: ''
} )

type GridItem = {
  id: number,
  material_idno: string,
  material_inventory_id: number,
  material_inventory_idno: string,
  issue_qty: number,
  lend_qty: number,
};

const rowData = ref<GridItem[]>( [] );

const gridOptions: GridOptions = {
  // PROPERTIES
  // Column Definitions
  columnDefs: [
    { field: "material_idno", headerName: '物料代碼', editable: false },
    { field: "material_inventory_idno", headerName: '單包代碼', editable: false },
    { field: "issue_qty", headerName: '發出數量' },
    { field: "lend_qty", headerName: '借出數量' },
  ],
  defaultColDef: { editable: true, filter: true, sortable: true, flex: 1, resizable: true },

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
  getRowId: ( params: GetRowIdParams ) => { return params.data.material_inventory_id; },

  // Scrolling
  debounceVerticalScrollbar: true,

  // Selection
  enableCellTextSelection: true,
  rowSelection: 'single',
  suppressCellFocus: true,

  // Styling
  suppressRowTransform: true,

  // EVENTS
  // Miscellaneous
}

const issuance = ref<IssuanceRead>();

onBeforeMount( async () => {
  try {
    issuance.value = await IssuancesService.getIssuance( { issuanceIdno: route.params.idno.toString() } )
    headerFormValue.value.st_erp_work_order_idno = issuance.value.st_erp_work_order_idno
    headerFormValue.value.st_erp_work_order_date = issuance.value.st_erp_work_order_date
    headerFormValue.value.st_erp_work_order_due_date = issuance.value.st_erp_work_order_due_date
    headerFormValue.value.st_erp_product_idno = issuance.value.st_erp_product_idno
    headerFormValue.value.st_erp_product_due_quanity = issuance.value.st_erp_product_due_quanity?.toLocaleString()
    headerFormValue.value.st_erp_production_department = issuance.value.st_erp_production_department
    headerFormValue.value.st_erp_production_line = issuance.value.st_erp_production_line
    headerFormValue.value.memo = issuance.value.memo

    for ( let issuanceItem of issuance.value.issuance_items as IssuanceItemRead[] ) {
      rowData.value.push( {
        id: issuanceItem.id,
        material_idno: issuanceItem.material_idno,
        material_inventory_id: issuanceItem.material_inventory_id,
        material_inventory_idno: issuanceItem.material_inventory_idno,
        issue_qty: issuanceItem.issue_qty,
        lend_qty: issuanceItem.lend_qty,
      } )
    }
    gridOptions.api.setRowData( rowData.value )
  } catch ( error ) { if ( error instanceof ApiError && error.status === 404 ) { router.push( '/http-status/404' ) } }
} )

const loadingRef = ref( false )
const loading = loadingRef


async function handleUpdateIssuanceButtonClick ( event: Event ) {
  // Block updating for a completed issuance
  if ( issuance.value?.issuing_completed ) { return false }

  loadingRef.value = true

  // Build issuance body
  const issuanceUpdate: IssuanceUpdate = { memo: headerFormValue.value.memo }

  // Create issuance
  try { issuance.value = await IssuancesService.updateIssuance( { issuanceIdno: route.params.idno.toString(), requestBody: issuanceUpdate } ) }
  catch ( error ) {
    message.error( '更新失敗' )
    loadingRef.value = false
    return false
  }

  message.success( `發料單 ${ issuance.value.idno } 更新成功` )
  router.push( '/wms/issuances' )
}


const inventoryAdditionFormValue = ref( { inventoryIdno: '' } );
const inventoryIdnoInput = ref();


async function onClickAddInventoryButton ( event: Event ) {
  // Block updating for a completed issuance
  if ( issuance.value?.issuing_completed ) { return false; }

  // Input field cannot be empty
  if ( inventoryAdditionFormValue.value.inventoryIdno.trim() === '' ) {
    message.error( '請填入單包代碼' );
    return false;
  }

  let inventory: MaterialInventoryRead;

  // Check if the material inventory exists
  // Handle 404 and other errors
  try { inventory = await MaterialInventoriesService.getMaterialInventory( { materialInventoryIdno: inventoryAdditionFormValue.value.inventoryIdno.trim() } ); }
  catch ( error ) {
    if ( error instanceof ApiError && error.status === 404 ) {
      message.error( '無此單包' );
      return false;
    } else {
      message.error( '讀取失敗' );
      return false;
    }
  }

  // Check if the material inventory available (not locked) for issuing
  if ( inventory.issuing_locked === true ) {
    message.error( '此單包已被其他發料單使用' );
    return false;
  }

  // Check if the material inventory's quantity is larger than 0
  const balance = await MaterialInventoriesService.getMaterialInventoryInStockBalance( {
    materialInventoryId: inventory.id,
    onlyIssuable: true,
  } )
  if ( balance <= 0 ) {
    message.error( '此單包已無可用庫存' )
    return false
  }

  // Check if the material inventory is in-stock
  const storage = await StoragesService.getStorage( { l1Id: inventory.l1_storage_id as number } )
  if ( storage.type != StorageTypeEnum.INTERNAL_WAREHOUSE ) {
    message.error( '此單包已無可用庫存' );
    return false;
  }


  try {
    // Request adding item with backend
    const item = await IssuancesService.addIssuanceItem( {
      issuanceIdno: route.params.idno.toString(),
      requestBody: { material_inventory_id: inventory.id, issue_qty: balance, lend_qty: 0, },
    } )

    // Add the responsed issuance item to grid
    rowData.value.unshift( {
      id: item.id,
      material_idno: item.material_idno,
      material_inventory_id: item.material_inventory_id,
      material_inventory_idno: item.material_inventory_idno,
      issue_qty: item.issue_qty,
      lend_qty: item.lend_qty,
    } )
    gridOptions.api.setRowData( rowData.value )

    message.success( '已增加成功 👍' )

    // Clear materialAdditionFormValue
    inventoryAdditionFormValue.value.inventoryIdno = ''

    // Focus at `material_idno` input field
    inventoryIdnoInput.value.focus()
  } catch ( error ) {
    message.error( '增加失敗' )
    return false
  }
}



async function onClickRemoveRowButton ( event: Event ) {
  // Block updating for a completed issuance
  if ( issuance.value?.issuing_completed ) { return false }

  // Get selected rows
  const selectedRows: GridItem[] = gridOptions.api.getSelectedRows()
  if ( selectedRows.length === 0 ) { return false }
  if ( selectedRows.length > 1 ) {
    message.warning( '請選擇單列' )
    return false
  }

  const selectedRow = selectedRows[ 0 ]

  try {
    const success = await IssuancesService.removeItem( { issuanceItemId: selectedRow.id, issuanceIdno: route.params.idno.toString(), } )
    message.success( '已刪除 🗑️' )

    // Remove the row from grid
    rowData.value = rowData.value.filter( row => row.material_inventory_idno !== selectedRows[ 0 ].material_inventory_idno )
    gridOptions.api.setRowData( rowData.value )
  } catch ( error ) {
    message.error( '刪除失敗' )
    return false
  }
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
        <router-link to="/wms/issuances" #=" { navigate, href } " custom>
          <n-a :href=" href " @click=" navigate ">發料備料作業</n-a>
        </router-link>
      </n-breadcrumb-item>
      <n-breadcrumb-item>{{ $route.params.idno.toString().toUpperCase() }}</n-breadcrumb-item>
    </n-breadcrumb>

    <div style="padding: 1rem;">
      <n-h1 prefix="bar" style="font-size: 1.4rem;">
        發料單 {{ $route.params.idno.toString().toUpperCase() }}
        <n-tag type="success" size="large" strong v-if=" issuance?.issuing_completed ">已發料</n-tag>
      </n-h1>
      <n-space vertical size="large"
        style="background-color: white; padding: 1rem; box-shadow: 0px 4px 20px -4px hsla(0, 0%, 60%, 0.4)">

        <n-form size="large" :model=" headerFormValue " ref="formRef" :disabled=" issuance?.issuing_completed ">
          <n-grid cols="1 s:3" responsive="screen" x-gap="20">

            <n-form-item-gi label="舊 ERP 工令編號">
              <n-input v-model:value.lazy=" headerFormValue.st_erp_work_order_idno " readonly
                :input-props=" { id: 'st_erp_work_order_idno' } "></n-input>
            </n-form-item-gi>

            <n-form-item-gi label="舊 ERP 工令日期">
              <n-input v-model:value.lazy=" headerFormValue.st_erp_work_order_date " readonly
                :input-props=" { id: 'st_erp_work_order_date' } " />
            </n-form-item-gi>

            <n-form-item-gi label="舊 ERP 計劃完工日期">
              <n-input v-model:value.lazy=" headerFormValue.st_erp_work_order_due_date " readonly
                :input-props=" { id: 'st_erp_work_order_due_date' } " />
            </n-form-item-gi>

            <n-form-item-gi label="舊 ERP 成品編號">
              <n-input v-model:value.lazy=" headerFormValue.st_erp_product_idno " readonly
                :input-props=" { id: 'st_erp_product_idno' } "></n-input>
            </n-form-item-gi>

            <n-form-item-gi label="舊 ERP 計畫成品數量">
              <n-input v-model:value.lazy=" headerFormValue.st_erp_product_due_quanity " readonly
                :input-props=" { id: 'st_erp_product_due_quanity' } "></n-input>
            </n-form-item-gi>

            <n-form-item-gi span="0 s:1"></n-form-item-gi>

            <n-form-item-gi label="舊 ERP 製造部門">
              <n-input v-model:value.lazy=" headerFormValue.st_erp_production_department " readonly
                :input-props=" { id: 'st_erp_production_department' } "></n-input>
            </n-form-item-gi>

            <n-form-item-gi label="舊 ERP 生產線別">
              <n-input v-model:value.lazy=" headerFormValue.st_erp_production_line " readonly
                :input-props=" { id: 'st_erp_production_line' } "></n-input>
            </n-form-item-gi>

            <n-form-item-gi label="備註" span="3">
              <n-input v-model:value.memo=" headerFormValue.memo " type="textarea"
                :input-props=" { id: 'memo' } "></n-input>
            </n-form-item-gi>

            <n-form-item-gi span="3">
              <n-button type="primary" block @click=" handleUpdateIssuanceButtonClick( $event ) " attr-type="submit"
                :disabled=" issuance?.issuing_completed " :loading=" loading ">
                更新備註
              </n-button>
            </n-form-item-gi>

          </n-grid>
        </n-form>

      </n-space>
    </div>



    <div style="padding: 1rem;">
      <n-space size="large" item-style="height: 40px; vertical-align: center" :align=" 'center' ">
        <n-h2 style="font-size: 1.2rem; margin-bottom: unset;">發料項目</n-h2>
      </n-space>

      <n-space vertical size="large"
        style="background-color: white; padding: 1rem; box-shadow: 0px 4px 20px -4px hsla(0, 0%, 60%, 0.4)">

        <n-form size="large" :model=" inventoryAdditionFormValue " :disabled=" issuance?.issuing_completed ">
          <n-space size="large">

            <n-form-item label="單包代碼">
              <n-input ref="inventoryIdnoInput" v-model:value.lazy=" inventoryAdditionFormValue.inventoryIdno "
                :input-props=" { id: 'inventoryIdnoInput' } "></n-input>
            </n-form-item>

            <n-form-item>
              <n-button type="primary" secondary strong @click=" onClickAddInventoryButton( $event ) "
                :disabled=" issuance?.issuing_completed " attr-type="submit">
                +</n-button>
            </n-form-item>

          </n-space>
        </n-form>

        <n-grid cols="1 s:3" responsive="screen" x-gap="20">

          <n-gi span="3">
            <n-space size="large" style="margin-bottom: 1rem;">
              <n-button type="error" tertiary @click=" onClickRemoveRowButton( $event ) "
                :disabled=" issuance?.issuing_completed " attr-type="button">刪除單列
              </n-button>
            </n-space>

            <div style="height: 600px; overflow-x: scroll; width: 100%;">
              <ag-grid-vue class="ag-theme-alpine" :rowData=" rowData " style="height: 100%; "
                :gridOptions=" gridOptions ">
              </ag-grid-vue>
            </div>

          </n-gi>

        </n-grid>
      </n-space>
    </div>
  </main>
</template>



<style>
main {
  background-image: url('/pattern.svg');
}
</style>
