<script setup lang="ts">
import { GetRowIdParams, GridOptions } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css"; // Core grid CSS, always needed
import "ag-grid-community/styles/ag-theme-alpine.css"; // Optional theme CSS
import { AgGridVue } from "ag-grid-vue3"; // the AG Grid Vue Component
import { FormInst, NA, NBreadcrumb, NBreadcrumbItem, NButton, NDivider, NForm, NFormItem, NFormItemGi, NGi, NGrid, NH1, NH2, NInput, NInputNumber, NSpace, useMessage } from 'naive-ui';
import { ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { ApiError, IssuanceCreate, IssuanceItemCreate, IssuanceRead, IssuancesService, MaterialInventoriesService, MaterialInventoryRead, MaterialsService, OpenAPI, StoragesService, StorageTypeEnum } from '../client';
import { useAuthStore } from '../stores/auth';



const message = useMessage();
const router = useRouter();

const authStore = useAuthStore();
OpenAPI.TOKEN = JSON.parse( authStore.accountToken )[ 'access_token' ];

const formRef = ref<FormInst | null>( null );
const headerFormValue = ref( { memo: '' } );

const materialIdnoInput = ref();
const materialUnit = ref();
const materialInventoryIdnoInput = ref();



type GridItem = {
  material_idno: string,
  material_inventory_id: number,
  material_inventory_idno: string,
  issue_qty: number,
  lend_qty: number,
};

type MaterialAdditionFormValue = {
  material_idno: string,
  issuable_balance: number,
  quantity: number,
};

const materialAdditionFormValue = ref<MaterialAdditionFormValue>( {
  material_idno: '',
  issuable_balance: 0,
  quantity: 0,
} );

const materialInventoryFormValue = ref( {
  material_inventory_idno: '',
} );

const rowData = ref<GridItem[]>( [] );
const gridOptions: GridOptions = {
  // GRID OPTIONS
  // Column Definitions
  columnDefs: [
    { field: "material_idno", headerName: '物料代碼', editable: false },
    { field: "material_inventory_idno", headerName: '單包代碼', editable: false },
    { field: "issue_qty", headerName: '發出數量', editable: false },
    { field: "lend_qty", headerName: '借出數量', editable: false },
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
  getRowId: ( params: GetRowIdParams ) => { return params.data.material_inventory_id; },

  // Scrolling
  debounceVerticalScrollbar: true,

  // Selection
  enableCellTextSelection: true,
  rowSelection: 'single',
  suppressCellFocus: true,

  // Styling
  suppressRowTransform: true,
};



async function onBlurMaterialIdnoInputField () {
  if ( materialAdditionFormValue.value.material_idno.trim() ) {
    try {
      // Update in-stock value and unit
      const material = await MaterialsService.getMaterial( { idno: materialAdditionFormValue.value.material_idno.trim() } );
      const issuableBalance = await MaterialsService.getMaterialInStockBalance( {
        materialIdno: materialAdditionFormValue.value.material_idno.trim(),
        onlyIssuable: true,
      } );
      materialUnit.value = material.unit;
      materialAdditionFormValue.value.issuable_balance = issuableBalance;
    } catch ( error ) { if ( error instanceof ApiError && error.status === 404 ) { materialUnit.value = ''; } }
  }
}



function addItemToGrid ( item: GridItem ) {
  // Remove old, duplicated one
  rowData.value = rowData.value.filter( row => row.material_inventory_idno !== item.material_inventory_idno );

  // Add
  rowData.value.unshift( {
    material_idno: item.material_idno,
    material_inventory_id: item.material_inventory_id,
    material_inventory_idno: item.material_inventory_idno,
    issue_qty: item.issue_qty,
    lend_qty: item.lend_qty,
  } );
  gridOptions.api.setRowData( rowData.value );
  gridOptions.columnApi.autoSizeAllColumns();
}



async function onClickAddMaterialButton ( event: Event ) {
  // Take expired material inventory in thie function is NOT allowed.

  // Quantity should greater than zero
  if ( materialAdditionFormValue.value.quantity <= 0 ) {
    message.error( '數量應大於零' );
    return false;
  }

  // `material_idno` cannot be empty
  if ( materialAdditionFormValue.value.material_idno.trim() === '' ) {
    message.error( '請填入物料代碼' );
    return false;
  }

  // Check if the material exists
  // Handle 404 and other errors
  try { const material = await MaterialsService.getMaterial( { idno: materialAdditionFormValue.value.material_idno.trim() } ); }
  catch ( error ) {
    if ( error instanceof ApiError && error.status === 404 ) {
      message.error( '無此物料' );
      return false;
    } else {
      message.error( '物料讀取失敗' );
      return false;
    }
  }

  // Check if quantity in-stock is enough
  const materialInStockBalance = await IssuancesService.getMaterialIssuableBalance( { materialIdno: materialAdditionFormValue.value.material_idno.trim() } );
  if ( materialAdditionFormValue.value.quantity > materialInStockBalance ) {
    message.error( `庫存數量 ${ materialInStockBalance.toLocaleString() }，需求數量不可大於庫存數量` );
    return false;
  }

  // Clear the material's all inventories in grid
  rowData.value = rowData.value.filter( row => row.material_idno !== materialAdditionFormValue.value.material_idno.trim() );
  gridOptions.api.setRowData( rowData.value );

  // Take demand inventories
  let askedQuantity = materialAdditionFormValue.value.quantity;
  let issuedQuantity = 0;
  let issuedMaterialInventories: MaterialInventoryRead[] = [];
  const materialInventories = await IssuancesService.getIssuableMaterialInventories( { materialIdno: materialAdditionFormValue.value.material_idno.trim() } );
  while ( issuedQuantity < askedQuantity ) {
    const materialInventory = materialInventories.shift();
    const materialInventoryBalance = await MaterialInventoriesService.getMaterialInventoryInStockBalance( { materialInventoryId: materialInventory.id } );
    issuedQuantity += materialInventoryBalance;
    issuedMaterialInventories.push( materialInventory as MaterialInventoryRead );
  }
  let lendQuantity = issuedQuantity - askedQuantity;
  issuedQuantity -= lendQuantity;

  // Build grid row data
  issuedMaterialInventories.forEach( async ( inventory, i ) => {
    const inventoryBalance = await MaterialInventoriesService.getMaterialInventoryInStockBalance( { materialInventoryId: inventory.id } );
    let issue_qty = inventoryBalance;
    let lend_qty = 0;

    if ( i == issuedMaterialInventories.length - 1 ) {
      lend_qty = lendQuantity;
      issue_qty = inventoryBalance - lend_qty;
    }

    // Add material inventories into the grid
    addItemToGrid( {
      material_idno: inventory.material_idno,
      material_inventory_id: inventory.id,
      material_inventory_idno: inventory.idno,
      issue_qty: issue_qty,
      lend_qty: lend_qty,
    } );
  } )

  // Clear materialAdditionFormValue
  materialAdditionFormValue.value.material_idno = '';
  materialAdditionFormValue.value.issuable_balance = 0;
  materialAdditionFormValue.value.quantity = 0;

  // Focus at `material_idno` input field
  materialIdnoInput.value.focus();
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
  const storage = await StoragesService.getStorage( { l1Id: materialInventory.l1_storage_id } );
  if ( storage.type != StorageTypeEnum.INTERNAL_WAREHOUSE ) {
    message.error( '此單包已無可用庫存' );
    return false;
  }

  // Add material inventories into the grid
  addItemToGrid( {
    material_idno: materialInventory.material_idno,
    material_inventory_id: materialInventory.id,
    material_inventory_idno: materialInventory.idno,
    issue_qty: balance,
    lend_qty: 0,
  } );

  // Clear materialAdditionFormValue
  materialInventoryFormValue.value.material_inventory_idno = '';

  // Focus at `material_idno` input field
  materialInventoryIdnoInput.value.focus();
}



function onClickRemoveRowButton ( event: Event ) {
  // Get selected row
  const selectedRows: GridItem[] = gridOptions.api.getSelectedRows();
  rowData.value = rowData.value.filter( row => row.material_inventory_idno !== selectedRows[ 0 ].material_inventory_idno );
  gridOptions.api.setRowData( rowData.value );
}



const loadingRef = ref( false );
const loading = loadingRef;



async function handleCreateIssuanceButtonClick ( event: Event ) {
  loadingRef.value = true;

  // Build issuance body
  const issuanceCreate: IssuanceCreate = { memo: headerFormValue.value.memo };

  // Create issuance
  let issuance: IssuanceRead;
  try { issuance = await IssuancesService.createIssuance( { requestBody: issuanceCreate } ); }
  catch ( error ) {
    message.error( '建立失敗' );
    loadingRef.value = false;
    return false;
  }

  // Build issuance items body
  const issuanceItemsCreate: IssuanceItemCreate[] = [];
  for ( let row of rowData.value ) {
    issuanceItemsCreate.push( {
      material_inventory_id: row.material_inventory_id,
      issue_qty: row.issue_qty,
      lend_qty: row.lend_qty,
    } );
  }

  // Create issuance items
  try { const issuanceItems = await IssuancesService.createIssuanceItems( { issuanceIdno: issuance.idno, requestBody: issuanceItemsCreate } ); }
  catch ( error ) {
    message.error( '建立失敗' );
    loadingRef.value = false;
    return false;
  }

  message.success( `發料單 ${ issuance.idno } 建立成功` );
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
      <n-breadcrumb-item>收發作業</n-breadcrumb-item>
      <n-breadcrumb-item>
        <router-link to="/issuances" #=" { navigate, href } " custom>
          <n-a :href=" href " @click=" navigate ">發料備料作業</n-a>
        </router-link>
      </n-breadcrumb-item>
      <n-breadcrumb-item>建立發料單</n-breadcrumb-item>
    </n-breadcrumb>

    <div style="padding: 1rem;">
      <n-h1 prefix="bar" style="font-size: 1.4rem;">建立發料單</n-h1>
      <n-space vertical size="large"
        style="background-color: white; padding: 1rem; box-shadow: 0px 4px 20px -4px hsla(0, 0%, 60%, 0.4)">

        <n-form size="large" :model=" headerFormValue " ref="formRef">
          <n-grid cols="1 s:3" responsive="screen" x-gap="20">

            <n-form-item-gi label="備註" span="3">
              <n-input v-model:value.memo=" headerFormValue.memo "></n-input>
            </n-form-item-gi>

            <n-gi span="3">
              <n-divider />
            </n-gi>

            <n-gi span="3">

              <n-h2 style="font-size: 1.2rem; margin-bottom: unset;">物料</n-h2>

              <n-form size="large" :model=" materialAdditionFormValue ">
                <n-space size="large">

                  <n-form-item label="物料代碼">
                    <n-input v-model:value.lazy=" materialAdditionFormValue.material_idno " ref="materialIdnoInput"
                      @blur=" onBlurMaterialIdnoInputField() ">
                    </n-input>
                  </n-form-item>

                  <n-form-item label="可發料數量">
                    <!-- Naive UI 數字輸入框目前不支援 tabindex 屬性 -->
                    <n-input-number v-model:value.lazy=" materialAdditionFormValue.issuable_balance "
                      :show-button=" false " :min=" 0 " :precision=" 0 " :default-value=" 0 " readonly tabindex="-1"
                      :input-props=" { tabindex: -1 } ">
                      <template #suffix> {{ materialUnit }} </template>
                    </n-input-number>
                  </n-form-item>

                  <n-form-item label="需求數量">
                    <n-input-number v-model:value.lazy=" materialAdditionFormValue.quantity " :show-button=" false "
                      :min=" 0 " :precision=" 0 " :default-value=" 0 ">
                      <template #suffix> {{ materialUnit }} </template>
                    </n-input-number>
                  </n-form-item>

                  <n-form-item>
                    <n-button type="primary" secondary strong @click=" onClickAddMaterialButton( $event ) "
                      attr-type="submit">+</n-button>
                  </n-form-item>

                </n-space>
              </n-form>

              <n-form size="large" :model=" materialInventoryFormValue ">
                <n-space size="large">

                  <n-form-item label="單包代碼">
                    <n-input v-model:value.lazy=" materialInventoryFormValue.material_inventory_idno "
                      ref="materialInventoryIdnoInput"> </n-input>
                  </n-form-item>

                  <n-form-item>
                    <n-button type="primary" secondary strong @click=" onClickAddInventoryButton( $event ) "
                      attr-type="submit">+</n-button>
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
              <n-button type="primary" block @click=" handleCreateIssuanceButtonClick( $event ) " attr-type="submit"
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
