<script setup lang="ts">
import { GetRowIdParams, GridOptions, RowDataUpdatedEvent, ViewportChangedEvent } from "ag-grid-community"
import "ag-grid-community/styles/ag-grid.css" // Core grid CSS, always needed
import "ag-grid-community/styles/ag-theme-alpine.css" // Optional theme CSS
import { AgGridVue } from "ag-grid-vue3" // the AG Grid Vue Component
import { format } from 'date-fns'
import { FormInst, FormItemRule, FormRules, NA, NBreadcrumb, NBreadcrumbItem, NButton, NDatePicker, NDivider, NForm, NFormItem, NFormItemGi, NGi, NGrid, NH1, NH2, NInput, NInputNumber, NSpace, useMessage } from 'naive-ui'
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { ApiError, IssuanceCreate, IssuanceItemCreate, IssuanceRead, IssuancesService, MaterialInventoriesService, MaterialInventoryRead, MaterialsService, OpenAPI, StoragesService, StorageTypeEnum } from '../../client'
import { useAuthStore } from '../../stores/auth'

const message = useMessage();
const router = useRouter();

const authStore = useAuthStore();
OpenAPI.TOKEN = JSON.parse( authStore.accountToken )[ 'access_token' ];

const headerFormValue = ref( {
  st_erp_work_order_idno: '',
  st_erp_work_order_date: null,
  st_erp_work_order_due_date: null,
  st_erp_product_idno: '',
  st_erp_product_due_quanity: null,
  st_erp_production_department: '',
  st_erp_production_line: '',
  memo: '',
} )

const materialIdnoInput = ref();
const materialUnit = ref();
const materialInventoryIdnoInput = ref();

type GridItem = {
  materialIdno: string,
  materialInventoryId: number,
  materialInventoryIdno: string,
  issueQty: number,
  lendQty: number,
}

const materialAdditionFormRef = ref<FormInst | null>( null )
const rules: FormRules = {
  materialIdno: { required: true, message: '請輸入物料代碼', trigger: [ 'blur', 'input', 'change' ] },
  quantity: {
    required: true, message: '請輸入數量', trigger: [ 'blur', 'input', 'change' ], type: 'number',
    validator: ( rule: FormItemRule, value: number ) => { return ( value > 0 ) },
  },
}

type MaterialAdditionFormValue = {
  materialIdno: string,
  issuableBalance: number,
  quantity: number,
}

const materialAdditionFormValue = ref<MaterialAdditionFormValue>( {
  materialIdno: '',
  issuableBalance: 0,
  quantity: 0,
} )

const materialInventoryFormValue = ref( {
  material_inventory_idno: '',
} );

const rowData = ref<GridItem[]>( [] );
const gridOptions: GridOptions = {
  // PROPERTIES
  // Column Definitions
  columnDefs: [
    { field: "materialInventoryIdno", headerName: '單包代碼', editable: true },
    { field: "materialIdno", headerName: '物料代碼', editable: false },
    { field: "totalQty", headerName: '合計數量', editable: false },
    { field: "issueQty", headerName: '發出數量', editable: true },
    { field: "lendQty", headerName: '借出數量', editable: true },
    { field: "retainQty", headerName: '保留數量', editable: true },
  ],
  defaultColDef: { editable: false, filter: true, sortable: true, resizable: true },

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
  getRowId: ( params: GetRowIdParams ) => { return params.data.material_inventory_id },

  // Scrolling
  debounceVerticalScrollbar: false,

  // Selection
  enableCellTextSelection: true,
  rowSelection: 'single',
  suppressCellFocus: true,

  // Styling
  suppressRowTransform: true,

  // EVENTS
  // Miscellaneous
  onGridReady: () => { },
  onViewportChanged: ( event: ViewportChangedEvent ) => { event.columnApi.autoSizeAllColumns() },

  // RowModel: Client-Side
  onRowDataUpdated: ( event: RowDataUpdatedEvent ) => { event.columnApi.autoSizeAllColumns() },
}



async function onBlurMaterialIdnoInputField () {
  if ( materialAdditionFormValue.value.materialIdno.trim() ) {
    try {
      // Update in-stock value and unit
      const material = await MaterialsService.getMaterial( { idno: materialAdditionFormValue.value.materialIdno.trim() } );
      const issuableBalance = await MaterialsService.getMaterialInStockBalance( {
        materialIdno: materialAdditionFormValue.value.materialIdno.trim(),
        onlyIssuable: true,
      } );
      materialUnit.value = material.unit;
      materialAdditionFormValue.value.issuableBalance = issuableBalance;
    } catch ( error ) { if ( error instanceof ApiError && error.status === 404 ) { materialUnit.value = ''; } }
  }
}



function addItemToGrid ( item: GridItem ) {
  // Remove old, duplicated one
  rowData.value = rowData.value.filter( row => row.materialInventoryIdno !== item.materialInventoryIdno )

  // Add
  rowData.value.unshift( {
    materialIdno: item.materialIdno,
    materialInventoryId: item.materialInventoryId,
    materialInventoryIdno: item.materialInventoryIdno,
    issueQty: item.issueQty,
    lendQty: item.lendQty,
  } )
  gridOptions.api?.setRowData( rowData.value )
}



async function onClickAddMaterialButton ( event: Event ) {
  // Take expired material inventory in thie function is NOT allowed.

  try { await materialAdditionFormRef.value?.validate( async ( error ) => { if ( error ) { throw error } } ) }
  catch ( error ) { return false }

  // Check if the material exists
  // Handle 404 and other errors
  try { const material = await MaterialsService.getMaterial( { idno: materialAdditionFormValue.value.materialIdno.trim() } ) }
  catch ( error ) {
    if ( error instanceof ApiError && error.status === 404 ) {
      message.error( '無此物料' )
      return false
    } else {
      message.error( '物料讀取失敗' )
      return false
    }
  }

  // Check if quantity in-stock is enough
  const materialInStockBalance = await IssuancesService.getMaterialIssuableBalance( { materialIdno: materialAdditionFormValue.value.materialIdno.trim() } )
  if ( materialAdditionFormValue.value.quantity > materialInStockBalance ) {
    message.error( `庫存數量 ${ materialInStockBalance.toLocaleString() }，需求數量不可大於庫存數量` )
    return false
  }

  // Take demand inventories
  let toAskQuantity = materialAdditionFormValue.value.quantity
  let toIssueQuantity = 0
  let toIssueMaterialInventories: MaterialInventoryRead[] = []
  const issuableMaterialInventoryArray = await IssuancesService.getIssuableMaterialInventories( { materialIdno: materialAdditionFormValue.value.materialIdno.trim() } )
  while ( toIssueQuantity < toAskQuantity ) {
    const materialInventory = issuableMaterialInventoryArray.shift()
    const materialInventoryBalance = await MaterialInventoriesService.getMaterialInventoryInStockBalance( { materialInventoryId: materialInventory.id } )
    toIssueQuantity += materialInventoryBalance
    toIssueMaterialInventories.push( materialInventory )
  }
  let toLendQuantity = toIssueQuantity - toAskQuantity
  toIssueQuantity -= toLendQuantity

  // Build grid row data
  toIssueMaterialInventories.forEach( async ( inventory, i ) => {
    const inventoryBalance = await MaterialInventoriesService.getMaterialInventoryInStockBalance( { materialInventoryId: inventory.id } )
    let issue_qty = inventoryBalance
    let lend_qty = 0

    if ( i == toIssueMaterialInventories.length - 1 ) {
      lend_qty = toLendQuantity
      lend_qty = parseFloat( lend_qty.toFixed( 4 ) )
      issue_qty = inventoryBalance - lend_qty
      issue_qty = parseFloat( issue_qty.toFixed( 4 ) )
    }

    // Add material inventories into the grid
    addItemToGrid( {
      materialIdno: inventory.material_idno,
      materialInventoryId: inventory.id,
      materialInventoryIdno: inventory.idno,
      issueQty: issue_qty,
      lendQty: lend_qty,
    } )
  } )

  // Clear materialAdditionFormValue
  materialAdditionFormValue.value.materialIdno = ''
  materialAdditionFormValue.value.issuableBalance = 0
  materialAdditionFormValue.value.quantity = 0

  // Focus at `material_idno` input field
  materialIdnoInput.value.focus()
}



async function onClickAddInventoryButton ( event: Event ) {
  // Take expired material inventory in thie function is allowed.

  // `material_inventory_idno` cannot be empty
  if ( materialInventoryFormValue.value.material_inventory_idno.trim() === '' ) {
    message.error( '請填入單包代碼' );
    return false;
  }

  // Check if the material inventory exists
  // Handle 404 and other errors
  let materialInventory: MaterialInventoryRead;
  try { materialInventory = await MaterialInventoriesService.getMaterialInventory( { materialInventoryIdno: materialInventoryFormValue.value.material_inventory_idno.trim() } ); }
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
  if ( materialInventory.issuing_locked === true ) {
    message.error( '此單包已被其他發料單使用' );
    return false;
  }

  // Check if the material inventory's quantity is larger than 0
  const balance = await MaterialInventoriesService.getMaterialInventoryInStockBalance( {
    materialInventoryId: materialInventory.id,
    onlyIssuable: true,
  } )
  if ( balance <= 0 ) {
    message.error( '此單包已無可用庫存' );
    return false;
  }

  // Check if the material inventory is in-stock
  const storage = await StoragesService.getStorage( { l1Id: materialInventory.l1_storage_id as number } );
  if ( storage.type != StorageTypeEnum.INTERNAL_WAREHOUSE ) {
    message.error( '此單包已無可用庫存' );
    return false;
  }

  // Add material inventories into the grid
  addItemToGrid( {
    materialIdno: materialInventory.material_idno,
    materialInventoryId: materialInventory.id,
    materialInventoryIdno: materialInventory.idno,
    issueQty: balance,
    lendQty: 0,
  } )

  // Clear materialAdditionFormValue
  materialInventoryFormValue.value.material_inventory_idno = ''

  // Focus at `material_idno` input field
  materialInventoryIdnoInput.value.focus()
}



function onClickRemoveRowButton ( event: Event ) {
  // Get selected row
  const selectedRows: GridItem[] = gridOptions.api?.getSelectedRows() as GridItem[]
  rowData.value = rowData.value.filter( row => row.materialInventoryIdno !== selectedRows[ 0 ].materialInventoryIdno )
  gridOptions.api?.setRowData( rowData.value )
}


const loadingRef = ref( false );
const loading = loadingRef;


async function onClickCreateIssuanceButton ( event: Event ) {
  loadingRef.value = true

  // Build issuance body
  const issuanceCreate: IssuanceCreate = {
    memo: headerFormValue.value.memo,
    st_erp_work_order_idno: headerFormValue.value.st_erp_work_order_idno,
    st_erp_work_order_date: headerFormValue.value.st_erp_work_order_date ? format( headerFormValue.value.st_erp_work_order_date, 'yyyy-MM-dd' ) : null,
    st_erp_work_order_due_date: headerFormValue.value.st_erp_work_order_due_date ? format( headerFormValue.value.st_erp_work_order_due_date, 'yyyy-MM-dd' ) : null,
    st_erp_product_idno: headerFormValue.value.st_erp_product_idno,
    st_erp_product_due_quanity: Number( headerFormValue.value.st_erp_product_due_quanity ),
    st_erp_production_department: headerFormValue.value.st_erp_production_department,
    st_erp_production_line: headerFormValue.value.st_erp_production_line,
  }

  // Create issuance
  let issuance: IssuanceRead;
  try { issuance = await IssuancesService.createIssuance( { requestBody: issuanceCreate } ) }
  catch ( error ) {
    console.error( error.message )
    message.error( '建立失敗' )
    loadingRef.value = false
    return false
  }

  // Build issuance items body
  const issuanceItemsCreate: IssuanceItemCreate[] = [];
  for ( let row of rowData.value ) {
    issuanceItemsCreate.push( {
      material_inventory_id: row.materialInventoryId,
      issue_qty: row.issueQty,
      lend_qty: row.lendQty,
    } )
  }

  // Create issuance items
  try { const issuanceItems = await IssuancesService.createIssuanceItems( { issuanceIdno: issuance.idno, requestBody: issuanceItemsCreate } ) }
  catch ( error ) {
    if ( error instanceof ApiError ) { console.error( error.body ) }
    message.error( '建立失敗' )
    loadingRef.value = false
    return false
  }

  message.success( `發料單 ${ issuance.idno } 建立成功` );
  router.push( '/wms/issuances' );
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
      <n-breadcrumb-item>建立發料單</n-breadcrumb-item>
    </n-breadcrumb>

    <div style="padding: 1rem;">
      <n-h1 prefix="bar" style="font-size: 1.4rem;">建立發料單</n-h1>
      <n-space vertical size="large"
        style="background-color: white; padding: 1rem; box-shadow: 0px 4px 20px -4px hsla(0, 0%, 60%, 0.4)">

        <n-form size="large" :model=" headerFormValue ">
          <n-grid cols="1 s:3" responsive="screen" x-gap="20">

            <n-form-item-gi label="舊 ERP 工令編號">
              <n-input v-model:value.lazy=" headerFormValue.st_erp_work_order_idno "
                :input-props=" { id: 'st_erp_work_order_idno' } "></n-input>
            </n-form-item-gi>

            <n-form-item-gi label="舊 ERP 工令日期">
              <n-date-picker v-model:value.lazy=" headerFormValue.st_erp_work_order_date " type="date"
                id="st_erp_work_order_date" style="width: 100%;" :input-readonly=" false " />
            </n-form-item-gi>

            <n-form-item-gi label="舊 ERP 計劃完工日期">
              <n-date-picker v-model:value.lazy=" headerFormValue.st_erp_work_order_due_date " type="date"
                id="st_erp_work_order_due_date" style="width: 100%;" :input-readonly=" false " />
            </n-form-item-gi>

            <n-form-item-gi label="舊 ERP 成品編號">
              <n-input v-model:value.lazy=" headerFormValue.st_erp_product_idno "
                :input-props=" { id: 'st_erp_product_idno' } "></n-input>
            </n-form-item-gi>

            <n-form-item-gi label="舊 ERP 計畫成品數量">
              <n-input-number v-model:value.lazy=" headerFormValue.st_erp_product_due_quanity " :show-button=" false "
                :min=" 0 " :precision=" 0 " :default-value=" 0 " id="st_erp_product_due_quanity" style="width: 100%;">
              </n-input-number>
            </n-form-item-gi>

            <n-form-item-gi span="0 s:1"></n-form-item-gi>

            <n-form-item-gi label="舊 ERP 製造部門">
              <n-input v-model:value.lazy=" headerFormValue.st_erp_production_department "
                :input-props=" { id: 'st_erp_production_department' } "></n-input>
            </n-form-item-gi>

            <n-form-item-gi label="舊 ERP 生產線別">
              <n-input v-model:value.lazy=" headerFormValue.st_erp_production_line "
                :input-props=" { id: 'st_erp_production_line' } "></n-input>
            </n-form-item-gi>

            <n-form-item-gi label="備註" span="4">
              <n-input v-model:value.lazy=" headerFormValue.memo " type="textarea"
                :input-props=" { id: 'memo' } "></n-input>
            </n-form-item-gi>

            <n-gi span="4">
              <n-divider />
            </n-gi>

            <n-gi span="3">

              <n-h2 style="font-size: 1.2rem; margin-bottom: unset;">物料</n-h2>

              <n-form size="large" :model=" materialAdditionFormValue " :rules=" rules " ref="materialAdditionFormRef">
                <n-space size="large">

                  <n-form-item label="物料代碼" path="materialIdno">
                    <n-input v-model:value.lazy=" materialAdditionFormValue.materialIdno " ref="materialIdnoInput"
                      @blur=" onBlurMaterialIdnoInputField() " :input-props=" { id: 'material_idno' } ">
                    </n-input>
                  </n-form-item>

                  <n-form-item label="可發料數量">
                    <!-- Naive UI 數字輸入框目前不支援 tabindex 屬性 -->
                    <n-input-number v-model:value.lazy=" materialAdditionFormValue.issuableBalance "
                      :show-button=" false " :min=" 0 " :precision=" 4 " :default-value=" 0 " readonly tabindex="-1"
                      :input-props=" { tabindex: -1 } ">
                      <template #suffix> {{ materialUnit }} </template>
                    </n-input-number>
                  </n-form-item>

                  <n-form-item label="需求數量" path="quantity">
                    <n-input-number v-model:value.lazy=" materialAdditionFormValue.quantity " :show-button=" false "
                      :min=" 0 " :precision=" 4 " :default-value=" 0 " id="quantity">
                      <template #suffix> {{ materialUnit }} </template>
                    </n-input-number>
                  </n-form-item>

                  <n-form-item>
                    <n-button type="primary" secondary strong @click=" onClickAddMaterialButton( $event ) "
                      attr-type="submit" id="add_by_material">+</n-button>
                  </n-form-item>

                </n-space>
              </n-form>

              <n-form size="large" :model=" materialInventoryFormValue ">
                <n-space size="large">

                  <n-form-item label="單包代碼">
                    <n-input v-model:value.lazy=" materialInventoryFormValue.material_inventory_idno "
                      :input-props=" { id: 'inventoryIdnoInput' } " ref="materialInventoryIdnoInput"> </n-input>
                  </n-form-item>

                  <n-form-item>
                    <n-button type="primary" secondary strong @click=" onClickAddInventoryButton( $event ) "
                      attr-type="submit" id="addByInventory">+</n-button>
                  </n-form-item>

                </n-space>
              </n-form>

              <n-space size="large" style="margin-bottom: 1rem;">

                <n-button type="error" tertiary @click=" onClickRemoveRowButton( $event ) " attr-type="button">刪除單列
                </n-button>

              </n-space>

              <div style="height: 600px; overflow-x: scroll; width: 100%;">
                <ag-grid-vue class="ag-theme-alpine" :rowData=" rowData " style="height: 100%; "
                  :gridOptions=" gridOptions ">
                </ag-grid-vue>
              </div>

            </n-gi>

            <n-form-item-gi span="3">
              <!-- To prevent unintend submit the form, set the attr-type as `button`, not `submit`.  -->
              <n-button type="primary" block @click=" onClickCreateIssuanceButton( $event ) " attr-type="button"
                :loading=" loading ">
                建立發料單
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
