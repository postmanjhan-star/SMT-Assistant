<script setup lang="ts">
import { GetRowIdParams, GridOptions } from "ag-grid-community"
import "ag-grid-community/styles/ag-grid.css" // Core grid CSS, always needed
import "ag-grid-community/styles/ag-theme-alpine.css" // Optional theme CSS
import { AgGridVue } from "ag-grid-vue3" // the AG Grid Vue Component
import { NA, NBreadcrumb, NBreadcrumbItem, NButton, NForm, NFormItemGi, NGrid, NH1, NInput, NInputNumber, NSpace, NTooltip, useMessage } from 'naive-ui'
import { onBeforeMount, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ApiError, MaterialsService, OpenAPI, StErpService, STWorkOrder, STWorkOrderItem } from '../../client'
import { useAuthStore } from '../../stores/auth'

const message = useMessage()
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
OpenAPI.TOKEN = JSON.parse( authStore.accountToken )[ 'access_token' ]

const headerFormValue = ref( {
  workOrderIdno: '',
  productIdno: '',
  issueDate: '',
  dueDate: '',
  quantity: '',
  productionDepartment: '',
  productionLine: '',
} )

type GridItem = {
  workOrderIdno: string,
  productIdno: string,
  materialIdno: string,
  materialInWms: boolean | null,
  dueQuantity: number,
  issuedQuantity: number,
  shortageQuantity: number,
  productionPosition: string,
}

const rowData = ref<GridItem[]>( [] )
const gridOptions: GridOptions = {
  // PROPERTIES
  // Column Definitions
  columnDefs: [
    // { field: "workOrderIdno", headerName: '工令編號' },
    // { field: "productIdno", headerName: '成品編號' },
    { field: "materialInWms", headerName: '已有 WMS 材料主檔', refData: { true: '✅' } },
    { field: "materialIdno", headerName: '材料編號' },
    { field: "dueQuantity", headerName: '應發數量' },
    // { field: "issuedQuantity", headerName: '實發數量' },
    // { field: "shortageQuantity", headerName: '欠料數量' },
    { field: "productionPosition", headerName: '配料位置' },
  ],
  defaultColDef: { editable: false, filter: true, sortable: true, resizable: true },

  // Column Moving

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
  getRowId: ( params: GetRowIdParams<GridItem> ) => { return params.data.materialIdno },

  // Scrolling
  debounceVerticalScrollbar: false,

  // Selection
  enableCellTextSelection: true,
  rowSelection: 'single',
  suppressCellFocus: true,

  // Styling
  suppressRowTransform: true,

  // Tooltips

  // EVENTS
  // Miscellaneous
  onViewportChanged: ( event ) => { event.columnApi.autoSizeAllColumns() },

  // RowModel: Client-Side
  onRowDataUpdated: ( event ) => { event.columnApi.autoSizeAllColumns() },
}


onBeforeMount( async () => {
  let workOrder: STWorkOrder;
  try {
    workOrder = await StErpService.getStWorkOrder( { workOrderIdno: route.params.idno.toString() } );
    headerFormValue.value.workOrderIdno = workOrder.work_order_idno
    headerFormValue.value.productIdno = workOrder.product_idno
    headerFormValue.value.issueDate = workOrder.issue_date
    headerFormValue.value.dueDate = workOrder.due_date
    headerFormValue.value.quantity = workOrder.quantity.toLocaleString()
    headerFormValue.value.productionDepartment = workOrder.production_department
    headerFormValue.value.productionLine = workOrder.production_line
  } catch ( error ) { if ( error instanceof ApiError && error.status === 404 ) { router.push( '/http-status/404' ); } }

  const workOrderItems = ref<STWorkOrderItem[]>();
  try {
    workOrderItems.value = await StErpService.getStWorkOrderItems( { workOrderIdno: route.params.idno.toString() } );
    for ( let workOrderItem of workOrderItems.value ) {
      let materialInWms: boolean | null;

      try {
        const wmsMaterial = await MaterialsService.getMaterial( { idno: workOrderItem.material_idno } )
        materialInWms = true;
      } catch ( error ) { materialInWms = false; }

      rowData.value.push( {
        workOrderIdno: workOrderItem.work_order_idno,
        productIdno: workOrderItem.product_idno,
        materialIdno: workOrderItem.material_idno,
        materialInWms: materialInWms,
        dueQuantity: workOrderItem.due_quantity,
        issuedQuantity: workOrderItem.issued_quantity,
        shortageQuantity: workOrderItem.shortage_quantity,
        productionPosition: workOrderItem.production_position,
      } )
    }
    gridOptions.api.setRowData( rowData.value );
  } catch ( error ) { if ( error instanceof ApiError && error.status === 404 ) { router.push( '/http-status/404' ); } }
} );

async function onClickCreateWmsMaterial ( event: Event ) { }

// Not implemented yet
async function onClickCreateIssuanceButton ( event: Event ) {
  // // Check if all materials in grid exist in WMS
  // for ( let row of rowData.value ) {
  //   if ( !row.materialInWms ) {
  //     message.error( `請先建立 ${ row.materialIdno } 之 WMS 物料主檔` )
  //     return false
  //   }
  // }

  try {
    const issuance = await StErpService.convertStErpWorkOrderToWmsIssuance( { workOrderIdno: route.params.idno.toString() } )
    router.push( `/wms/issuances/${ issuance.idno }` )
  } catch ( error ) {
    if ( error instanceof ApiError ) {
      console.error( error.body )
      if ( error.status == 409 ) { message.error( '此工單已建立過，不可重複建立' ) }
      if ( error.status == 422 ) {
        if ( error.body[ 'detail' ][ 'error_code' ] == 'E-STERP-001' ) { message.error( `請先建立 ${ error.body[ 'detail' ][ 'resource_entity' ] } 之 WMS 物料主檔` ) }
        if ( error.body[ 'detail' ][ 'error_code' ] == 'E-STERP-002' ) { message.error( `${ error.body[ 'detail' ][ 'resource_entity' ] } 物料不足` ) }
      }
    }
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
        <router-link to="/wms/st_erp_work_orders" #=" { navigate, href } " custom>
          <n-a :href=" href " @click=" navigate ">舊 ERP 工單紀錄</n-a>
        </router-link>
      </n-breadcrumb-item>
      <n-breadcrumb-item>{{ $route.params.idno.toString().toUpperCase() }}</n-breadcrumb-item>
    </n-breadcrumb>



    <div style="padding: 1rem;">
      <n-h1 prefix="bar" style="font-size: 1.4rem;">
        舊 ERP 工單 {{ $route.params.idno.toString().toUpperCase() }}
      </n-h1>
      <n-space vertical size="large"
        style="background-color: white; padding: 1rem; box-shadow: 0px 4px 20px -4px hsla(0, 0%, 60%, 0.4)">

        <n-space size="large" style="padding-block-end: 1rem;">
          <n-tooltip>
            <template #trigger>
              <n-button type="primary" size="large" @click=" onClickCreateIssuanceButton( $event ) ">建立 WMS 發料單
              </n-button>
            </template>
            建立 WMS 發料單前務必先建立 WMS 之「物料主檔」
          </n-tooltip>
        </n-space>

        <n-form size="large" :model=" headerFormValue ">
          <n-grid cols="1 s:3" responsive="screen" x-gap="20">

            <n-form-item-gi label="製品編號">
              <n-input v-model:value.lazy=" headerFormValue.productIdno " readonly
                :input-props=" { id: 'productIdno' } "></n-input>
            </n-form-item-gi>

            <n-form-item-gi label="發料日期">
              <n-input v-model:value.lazy=" headerFormValue.issueDate " readonly
                :input-props=" { id: 'issueDate' } "></n-input>
            </n-form-item-gi>

            <n-form-item-gi label="計劃完工日期">
              <n-input v-model:value.lazy=" headerFormValue.dueDate " readonly
                :input-props=" { id: 'dueDate' } "></n-input>
            </n-form-item-gi>

            <n-form-item-gi label="工令數量">
              <n-input v-model:value.lazy=" headerFormValue.quantity " readonly
                :input-props=" { id: 'quantity' } "></n-input>
            </n-form-item-gi>

            <n-form-item-gi label="製造部門">
              <n-input v-model:value.lazy=" headerFormValue.productionDepartment " readonly
                :input-props=" { id: 'productionDepartment' } "></n-input>
            </n-form-item-gi>

            <n-form-item-gi label="生產線別">
              <n-input v-model:value.lazy=" headerFormValue.productionLine " readonly
                :input-props=" { id: 'productionLine' } "></n-input>
            </n-form-item-gi>

          </n-grid>
        </n-form>

        <n-space>
          <!-- <n-button size="large" @click=" onClickCreateWmsMaterial( $event ) ">建立 WMS 材料主檔</n-button> -->
        </n-space>

        <div style="height: 600px; overflow-x: scroll; width: 100%;">
          <ag-grid-vue class="ag-theme-alpine" :rowData=" rowData " style="height: 100%; " :gridOptions=" gridOptions ">
          </ag-grid-vue>
        </div>

      </n-space>
    </div>

  </main>
</template>



<style>
main {
  background-image: url('/pattern.svg');
}
</style>
