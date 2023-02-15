<script setup lang="ts">
import { GetRowIdParams, GridOptions } from "ag-grid-community"
import "ag-grid-community/styles/ag-grid.css" // Core grid CSS, always needed
import "ag-grid-community/styles/ag-theme-alpine.css" // Optional theme CSS
import { AgGridVue } from "ag-grid-vue3" // the AG Grid Vue Component
import { FormInst, NA, NBreadcrumb, NBreadcrumbItem, NButton, NForm, NFormItemGi, NGi, NGrid, NH1, NH2, NInput, NSpace, NTag, useMessage } from 'naive-ui'
import { onBeforeMount, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ApiError, IssuanceItemRead, IssuanceRead, IssuancesService, IssuanceUpdate, MaterialInventoriesService, MaterialInventoryRead, OpenAPI, StoragesService, StorageTypeEnum } from '../../client'
import { useAuthStore } from '../../stores/auth.js'

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
  materialIdno: string,
  materialInventoryId: number,
  materialInventoryIdno: string,
  issueQty: number,
  lendQty: number,
  retainQty: number,
  totalQty: number,
}

const rowData = ref<GridItem[]>( [] );

const gridOptions: GridOptions = {
  // PROPERTIES
  // Column Definitions
  columnDefs: [
    {
      field: "materialInventoryIdno", headerName: '單包代碼',
      editable: ( params ) => { if ( params.node.rowPinned === 'top' ) { return true } },
      async onCellValueChanged ( params ) {
        // Make pinned row as an input of creating a new issuance item
        // Take expired material inventory from here is **allowed**.

        // `material_inventory_idno` cannot be empty
        if ( !!!params.newValue ) {
          message.error( '請填入單包代碼' )
          return false
        }

        // Check if the material inventory exists
        // Handle 404 and other errors
        let materialInventory: MaterialInventoryRead
        try { materialInventory = await MaterialInventoriesService.getMaterialInventory( { materialInventoryIdno: params.newValue.trim() } ) }
        catch ( error ) {
          if ( error instanceof ApiError && error.status === 404 ) { message.error( '無此單包' ) }
          else { message.error( '讀取失敗' ) }
          params.data.materialInventoryIdno = ''
          params.api.refreshCells()
          return false
        }

        // Check if the material inventory available (not locked) for issuing
        if ( materialInventory.issuing_locked === true ) {
          message.error( '此單包已被發料單使用' )
          params.data.materialInventoryIdno = ''
          params.api.refreshCells()
          return false
        }

        // Check if the material inventory's in-warehouse quantity is larger than 0
        let balance = 0
        const balances = await MaterialInventoriesService.getMaterialInventoryBalances( { materialInventoryIdno: materialInventory.idno } )
        balances.forEach( async ( value, index, array ) => {
          if ( value.l1_storage_type == StorageTypeEnum.INTERNAL_WAREHOUSE ) { balance += value.quantity }
        } )
        if ( balance <= 0 ) {
          message.error( '此單包已無可用庫存' )
          params.data.materialInventoryIdno = ''
          params.api.refreshCells()
          return false
        }

        params.data.materialIdno = materialInventory.material_idno
        params.data.materialInventoryId = materialInventory.id
        params.data.materialInventoryIdno = materialInventory.idno
        params.data.totalQty = balance
        params.data.issueQty = balance
        params.data.retainQty = 0
        params.data.lendQty = 0
        params.columnApi.autoSizeAllColumns()

        try {
          // Request adding item with backend
          const item = await IssuancesService.addIssuanceItem( {
            issuanceIdno: route.params.idno.toString(),
            requestBody: {
              material_inventory_id: params.data.materialInventoryId,
              issue_qty: params.data.issueQty,
              retain_qty: params.data.retainQty,
              lend_qty: params.data.lendQty,
            },
          } )

          // Add the responsed issuance item to grid
          rowData.value.unshift( {
            id: item.id,
            materialIdno: item.material_idno,
            materialInventoryId: item.material_inventory_id,
            materialInventoryIdno: item.material_inventory_idno,
            issueQty: item.issue_qty,
            lendQty: item.lend_qty,
            retainQty: item.retain_qty,
            totalQty: params.data.totalQty,
          } )
          gridOptions.api.setRowData( rowData.value )

          message.success( '增加成功 👍' )
        } catch ( error ) {
          if ( error instanceof ApiError ) { console.error( error.body ) }
          message.error( '增加失敗' )
          params.data.materialInventoryIdno = ''
          params.api.refreshCells()
          return false
        }

        params.api.setPinnedTopRowData( [ {} ] )
        params.api.refreshCells()
      },
    },
    { field: "materialIdno", headerName: '物料代碼', editable: false },
    { field: "totalQty", headerName: '合計數量', editable: false, type: 'numericColumn', cellEditor: false },
    {
      field: "issueQty", headerName: '發出數量', type: 'numericColumn',
      editable: ( params ) => {
        if ( issuance.value.issuing_completed ) { return false }
        if ( params.node.rowPinned === 'top' ) { return false } else { return true }
      },
      valueParser: ( params ) => { return Number( params.newValue ) },
      valueSetter: ( params ) => {
        if ( isNaN( params.newValue ) ) { return false }
        if ( params.newValue > params.data.totalQty ) { return false }
        params.data.issueQty = parseFloat( params.newValue.toFixed( 4 ) )
        params.data.retainQty = parseFloat( ( params.data.totalQty - params.newValue ).toFixed( 4 ) )
        params.data.lendQty = 0
        return true
      }
    },
    {
      field: "retainQty", headerName: '保留數量', type: 'numericColumn',
      editable: ( params ) => {
        if ( issuance.value.issuing_completed ) { return false }
        if ( params.node.rowPinned === 'top' ) { return false } else { return true }
      },
      valueParser: ( params ) => { return Number( params.newValue ) },
      valueSetter: ( params ) => {
        if ( isNaN( params.newValue ) ) { return false }
        if ( params.newValue >= params.data.totalQty ) { return false }
        params.data.retainQty = parseFloat( params.newValue.toFixed( 4 ) )
        params.data.issueQty = parseFloat( ( params.data.totalQty - params.newValue ).toFixed( 4 ) )
        params.data.lendQty = 0
        return true
      },
    },
    {
      field: "lendQty", headerName: '借出數量', type: 'numericColumn',
      editable: ( params ) => {
        if ( issuance.value.issuing_completed ) { return false }
        if ( params.node.rowPinned === 'top' ) { return false } else { return true }
      },
      valueParser: ( params ) => { return Number( params.newValue ) },
      valueSetter: ( params ) => {
        if ( isNaN( params.newValue ) ) { return false }
        if ( params.newValue >= params.data.totalQty ) { return false }
        params.data.lendQty = parseFloat( params.newValue.toFixed( 4 ) )
        params.data.issueQty = parseFloat( ( params.data.totalQty - params.newValue ).toFixed( 4 ) )
        params.data.retainQty = 0
        return true
      }
    },
  ],
  defaultColDef: {
    editable: true, filter: true, sortable: true, resizable: true,
    valueFormatter: ( params ) => {
      if ( params.node.rowPinned === 'top' && !!!params.value && params.colDef.field == 'materialInventoryIdno' ) {
        return '請輸入' + params.colDef.headerName
      }
    },
  },

  // Editing
  stopEditingWhenCellsLoseFocus: true,
  enterMovesDownAfterEdit: true,
  undoRedoCellEditing: true,

  // Miscellaneous
  debug: false,

  // Pagination
  pagination: true,

  // Rendering
  enableCellChangeFlash: true,
  suppressColumnVirtualisation: true,

  // Row Pinning

  // RowModel
  getRowId: ( params: GetRowIdParams<GridItem> ) => { return params.data.materialInventoryId.toString() },

  // Scrolling
  debounceVerticalScrollbar: false,

  // Selection
  rowSelection: 'single',
  rowMultiSelectWithClick: true,
  enableCellTextSelection: true,
  suppressCellFocus: false,

  // Styling
  getRowStyle: ( params ) => { if ( params.node.rowPinned ) { return { 'font-weight': 'bold' } } },
  suppressRowTransform: true,

  // EVENTS
  // Miscellaneous
  onViewportChanged: ( event ) => { event.columnApi.autoSizeAllColumns() },

  // RowModel: Client-Side
  onRowDataUpdated: ( event ) => { event.columnApi.autoSizeAllColumns() },
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
        materialIdno: issuanceItem.material_idno,
        materialInventoryId: issuanceItem.material_inventory_id,
        materialInventoryIdno: issuanceItem.material_inventory_idno,
        issueQty: parseFloat( issuanceItem.issue_qty.toFixed( 4 ) ),
        lendQty: parseFloat( issuanceItem.lend_qty.toFixed( 4 ) ),
        retainQty: parseFloat( issuanceItem.retain_qty.toFixed( 4 ) ),
        totalQty: parseFloat( ( issuanceItem.issue_qty + issuanceItem.lend_qty + issuanceItem.retain_qty ).toFixed( 4 ) ),
      } )
    }
    gridOptions.api.setRowData( rowData.value )
    if ( !issuance.value.issuing_completed ) { gridOptions.api.setPinnedTopRowData( [ {} ] ) }
  } catch ( error ) { if ( error instanceof ApiError && error.status === 404 ) { router.push( '/http-status/404' ) } }
} )

const updateIssuanceButtonLoading = ref( false )

async function onClickUpdateIssuanceButton ( event: Event ) {
  // Block updating for a completed issuance
  if ( issuance.value?.issuing_completed ) { return false }

  updateIssuanceButtonLoading.value = true

  // Build issuance body
  const issuanceUpdate: IssuanceUpdate = { memo: headerFormValue.value.memo }

  // Create issuance
  try { issuance.value = await IssuancesService.updateIssuance( { issuanceIdno: route.params.idno.toString(), requestBody: issuanceUpdate } ) }
  catch ( error ) {
    message.error( '更新失敗' )
    updateIssuanceButtonLoading.value = false
    return false
  }

  message.success( `發料單 ${ issuance.value.idno } 更新成功` )
  router.push( '/wms/issuances' )
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
    rowData.value = rowData.value.filter( row => row.materialInventoryIdno !== selectedRows[ 0 ].materialInventoryIdno )
    gridOptions.api.setRowData( rowData.value )
  } catch ( error ) {
    message.error( '刪除失敗' )
    return false
  }
}


const updateIssuanceItemsButtonLoading = ref( false )
async function onClickUpdateIssuanceItems ( event: Event ) {
  updateIssuanceItemsButtonLoading.value = true

  // Check issuance item quantities
  for ( let item of rowData.value ) {
    if ( item.issueQty + item.retainQty + item.lendQty != item.totalQty ) {
      message.error( `${ item.materialInventoryIdno } 數量不合` )
      return false
    }
    if ( item.retainQty > 0 && item.lendQty > 0 ) {
      message.error( `${ item.materialInventoryIdno } 數量不合` )
      return false
    }
  }

  for ( let item of rowData.value ) {
    if ( item.id ) {
      // Update this issuance item
      const issuanceItem = await IssuancesService.updateIssuanceItem( {
        issuanceIdno: route.params.idno.toString(),
        issuanceItemId: item.id,
        requestBody: { issue_qty: item.issueQty, retain_qty: item.retainQty, lend_qty: item.lendQty }
      } )
    } else {
      // Create a new issuance item
      const issuanceItem = await IssuancesService.addIssuanceItem( {
        issuanceIdno: route.params.idno.toString(),
        requestBody: {
          material_inventory_id: item.materialInventoryId,
          issue_qty: item.issueQty,
          retain_qty: item.retainQty,
          lend_qty: item.lendQty,
        }
      } )
      item.id = issuanceItem.id
    }
  }
  message.success( '更新成功' )
  updateIssuanceItemsButtonLoading.value = false
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
              <n-button type="primary" block @click=" onClickUpdateIssuanceButton( $event ) " attr-type="submit"
                :disabled=" issuance?.issuing_completed " :loading=" updateIssuanceButtonLoading ">
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

        <n-button type="primary" block @click=" onClickUpdateIssuanceItems( $event ) " attr-type="submit"
          :disabled=" issuance?.issuing_completed " :loading=" updateIssuanceItemsButtonLoading " size="large">
          更新發料項目
        </n-button>
      </n-space>
    </div>
  </main>
</template>



<style>
main {
  background-image: url('/pattern.svg');
}
</style>
