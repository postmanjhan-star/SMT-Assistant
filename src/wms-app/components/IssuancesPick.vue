<script setup lang="ts">
import { FormInst, NA, NBreadcrumb, NBreadcrumbItem, NButton, NDescriptions, NDescriptionsItem, NForm, NFormItem, NFormItemGi, NGi, NGrid, NH1, NH2, NInput, NSpace, NTag, NThing, useMessage } from 'naive-ui';
import { onBeforeMount, reactive, ref } from 'vue';
import { Dataset, DatasetInfo, DatasetItem, DatasetPager, DatasetSearch, DatasetShow } from 'vue-dataset';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { ApiError, IssuanceItemRead, IssuanceRead, IssuancesService, IssuanceUpdate, MaterialInventoriesService, MaterialInventoryRead, OpenAPI, StoragesService, StorageTypeEnum } from '../../client';
import { useAuthStore } from '../../stores/auth';



const message = useMessage();
const router = useRouter();
const route = useRoute();

const authStore = useAuthStore();
OpenAPI.TOKEN = JSON.parse( authStore.accountToken )[ 'access_token' ];

const formRef = ref<FormInst | null>( null );
const headerFormValue = ref( { memo: '' } );

const dsReRenderKey = ref( 0 ); // The 'KEY' to update vue-dataset. It takes me whole day to figure out the way to update a component.

type IssuanceItem = {
  id: number,
  material_idno: string,
  material_inventory_id: number,
  material_inventory_idno: string,
  issue_qty: number,
  lend_qty: number,
  picked: boolean,
};


let issuance = ref<IssuanceRead>();
let issuanceItemData = reactive<IssuanceItem[]>( [] );



onBeforeMount( async () => {
  try {
    issuance.value = await IssuancesService.getIssuance( { issuanceIdno: route.params.idno.toString() } );
    headerFormValue.value.memo = issuance.value.memo;
    for ( let issuanceItem of issuance.value.issuance_items as IssuanceItemRead[] ) {
      issuanceItemData.push( {
        id: issuanceItem.id,
        material_idno: issuanceItem.material_idno,
        material_inventory_id: issuanceItem.material_inventory_id,
        material_inventory_idno: issuanceItem.material_inventory_idno,
        issue_qty: issuanceItem.issue_qty,
        lend_qty: issuanceItem.lend_qty,
        picked: issuanceItem.picked,
      } )
    }
    dsReRenderKey.value += 1;
  } catch ( error ) { if ( error instanceof ApiError && error.status === 404 ) { router.push( '/http-status/404' ); } }
} );



const loadingRef = ref( false );
const loading = loadingRef;



async function handleUpdateIssuanceButtonClick ( event: Event ) {
  // Block updating for a completed issuance
  if ( issuance.value?.issuing_completed ) { return false; }

  loadingRef.value = true;

  // Build issuance body
  const issuanceUpdate: IssuanceUpdate = { memo: headerFormValue.value.memo };

  // Update issuance
  try { issuance.value = await IssuancesService.updateIssuance( { issuanceIdno: route.params.idno.toString(), requestBody: issuanceUpdate } ); }
  catch ( error ) {
    message.error( '更新失敗' );
    loadingRef.value = false;
    return false;
  }

  message.success( `發料單 ${ issuance.value.idno } 更新成功` );
  router.push( '/wms/issuances' );
}



const inventoryAdditionFormValue = ref( { inventoryIdno: '' } );
const inventoryIdnoInput = ref();

function clearAndFocusInventoryInput () {
  // Clear materialAdditionFormValue
  inventoryAdditionFormValue.value.inventoryIdno = '';

  // Focus at `material_idno` input field
  inventoryIdnoInput.value.focus();
}

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
      clearAndFocusInventoryInput();
      message.error( '無此單包' );
      return false;
    } else {
      clearAndFocusInventoryInput();
      message.error( '讀取失敗' );
      return false;
    }
  }

  // Check if the material inventory's quantity is larger than 0
  const balance = await MaterialInventoriesService.getMaterialInventoryInStockBalance({
    materialInventoryId: inventory.id,
    onlyIssuable: true,
  })
  if ( balance <= 0 ) {
    clearAndFocusInventoryInput();
    message.error( '此單包已無可用庫存' );
    return false;
  }

  // Check if the material inventory available (not locked by other issuances) for issuing
  let doesThisInventoryBelongsToThisIssuance = false;
  for ( let issuanceItem of issuanceItemData ) { if ( issuanceItem.material_inventory_id === inventory.id ) { doesThisInventoryBelongsToThisIssuance = true; } }
  if ( doesThisInventoryBelongsToThisIssuance === false ) {
    clearAndFocusInventoryInput();
    message.error( '此單包不屬於本發料單' );
    return false;
  }
  // // Disable this check, may enable for a reason.
  // if ( inventory.issuing_locked === true && doesThisInventoryBelongsToThisIssuance === false ) {
  //   clearAndFocusInventoryInput();
  //   message.error( '此單包已被其他發料單使用' );
  //   return false;
  // }

  // Check if the material inventory is in-stock
  const storage = await StoragesService.getStorage( { l1Id: inventory.l1_storage_id as number } );
  if ( storage.type != StorageTypeEnum.INTERNAL_WAREHOUSE ) {
    clearAndFocusInventoryInput();
    message.error( '此單包已無可用庫存' );
    return false;
  }

  // After all checks passed...
  if ( doesThisInventoryBelongsToThisIssuance ) {
    issuanceItemData.forEach( async ( issuanceItem, i ) => {
      if ( issuanceItem.material_inventory_id == inventory.id ) {
        if ( issuanceItem.picked === false ) {
          // Make the item card green.
          issuanceItemData[ i ].picked = true;
          // Ask backend to pick this item.
          await IssuancesService.pickMaterialInventory( { materialInventoryIdno: inventory.idno, issuanceIdno: issuance.value?.idno as string } );
        }
      }
    } );
    clearAndFocusInventoryInput();
  }
}



async function onClickConfirmPickingButton ( event: Event ) {
  // Refresh issuance.
  issuance.value = await IssuancesService.getIssuance( { issuanceIdno: issuance.value?.idno as string } );

  // Check all issuance items' `picked` state.
  const issuanceItems = issuance.value.issuance_items as IssuanceItemRead[] 
  issuanceItems.forEach( ( item, i ) => {
    if ( item.picked === false ) {
      message.error( `${ item.material_inventory_idno } 尚未備齊` );
      return false;
    }
  } );

  // Request backend to confirm the issuance. Make transfers for issuance items.
  try {
    issuance.value = await IssuancesService.pickIssuance( { issuanceIdno: issuance.value.idno } );
    if ( issuance.value.issuing_completed ) { message.success( `發料完成` ); }
    if ( issuance.value.issuing_completed === false ) { throw Error; }
  } catch ( error ) {
    message.error( `發料失敗` );
    return false;
  }

  router.push( '/wms/issuances' );
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
        <router-link to="/wms/issuances" #=" { navigate, href } " custom>
          <n-a :href=" href " @click=" navigate ">發料備料作業</n-a>
        </router-link>
      </n-breadcrumb-item>
      <n-breadcrumb-item>{{ $route.params.idno.toString().toUpperCase() }} 備料作業</n-breadcrumb-item>
    </n-breadcrumb>



    <div style="padding: 1rem;">
      <n-h1 prefix="bar" style="font-size: 1.4rem;">
        {{ $route.params.idno.toString().toUpperCase() }} 備料作業
        <n-tag type="success" size="large" strong v-if=" issuance?.issuing_completed ">已發料</n-tag>
      </n-h1>
      <n-space vertical size="large"
        style="background-color: white; padding: 1rem; box-shadow: 0px 4px 20px -4px hsla(0, 0%, 60%, 0.4)">

        <n-form size="large" :model=" headerFormValue " ref="formRef" :disabled=" issuance?.issuing_completed ">
          <n-grid cols="1 s:3" responsive="screen" x-gap="20">

            <n-form-item-gi label="備註" span="3">
              <n-input v-model:value.memo=" headerFormValue.memo "></n-input>
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
        <n-h2 style="font-size: 1.2rem; margin-bottom: unset;">備料項目</n-h2>
      </n-space>

      <n-space vertical size="large"
        style="background-color: white; padding: 1rem; box-shadow: 0px 4px 20px -4px hsla(0, 0%, 60%, 0.4)">

        <n-form size="large" :model=" inventoryAdditionFormValue " :disabled=" issuance?.issuing_completed ">
          <n-space size="large">

            <n-form-item label="單包代碼">
              <n-input ref="inventoryIdnoInput" v-model:value.lazy=" inventoryAdditionFormValue.inventoryIdno ">
              </n-input>
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
            <n-space size="large" vertical>


              <div style="border: 1px solid hsla(0, 0%, 80%, 1);">

                <dataset v-slot=" { ds } " :ds-data=" issuanceItemData " :key=" dsReRenderKey ">

                  <div
                    style="background-color: hsla(0, 0%, 92%, 1); padding: 1rem; display: grid; grid-template-columns: repeat(auto-fill, 200px); gap: 1rem;">

                    <dataset-show></dataset-show>
                    <dataset-search ds-search-placeholder="Search..."></dataset-search>
                  </div>


                  <dataset-item
                    style="display: grid; grid-template-columns: repeat(auto-fill, 200px); gap: 1rem; padding: 1rem;">
                    <template #default=" { row, roIndex, index } ">
                      <div style="padding: 1em;" :class=" row.picked ? 'item-card-picked' : 'item-card-unpicked' ">
                        <n-thing :titleExtra=" row.picked ? '🟢' : '' ">
                          <template #header>
                            <n-descriptions :bordered=" false " :column=" 1 " size="large" label-placement="top"
                              label-style="font-size: xx-small;">
                              <n-descriptions-item label="單包代碼">{{ row.material_inventory_idno }}</n-descriptions-item>
                            </n-descriptions>
                          </template>
                          <template #description>
                            <n-descriptions :bordered=" false " :column=" 1 " size="large" label-placement="top"
                              label-style="font-size: xx-small;">
                              <n-descriptions-item label="物料代碼">{{ row.material_idno }}</n-descriptions-item>
                            </n-descriptions>
                          </template>
                          <n-descriptions :bordered=" false " :column=" 2 " size="large" label-placement="top"
                            label-style="font-size: xx-small;">
                            <n-descriptions-item label="發出數量">{{ row.issue_qty }}</n-descriptions-item>
                            <n-descriptions-item label="借出數量">{{ row.lend_qty }}</n-descriptions-item>
                          </n-descriptions>
                          <!-- Not implement yet!
                          <template #action>
                            <n-space size="small">
                              <n-button type="error" ghost @click=" onClickRemoveRowButton( $event ) "
                                attr-type="button" size="tiny">
                                刪除此項
                              </n-button>
                            </n-space>
                          </template>-->
                        </n-thing>
                      </div>
                    </template>
                  </dataset-item>

                  <div style="background-color: hsla(0, 0%, 92%, 1); padding: 1rem;">
                    <dataset-info style="text-align: right;"></dataset-info>
                    <br />
                    <dataset-pager style="margin: unset; padding: unset; display: block; text-align: right;">
                    </dataset-pager>
                  </div>

                </dataset>
              </div>

              <n-button type="primary" block size="large" @click=" onClickConfirmPickingButton( $event ) "
                :disabled=" issuance?.issuing_completed " attr-type="submit" :loading=" loading ">
                確定發料
              </n-button>
            </n-space>

          </n-gi>

        </n-grid>
      </n-space>
    </div>
  </main>
</template>



<style>
.item-card-picked {
  border: 1px solid hsla(148, 74%, 36%, 1.0);
  padding: 1em;
  background-color: hsla(148, 74%, 36%, 0.16);
}

.item-card-unpicked {
  border: 1px solid hsla(0, 0%, 80%, 1.0);
  padding: 1em;
  background-color: hsla(0, 0%, 96%, 1);
}

.form-inline>* {
  margin-right: 1em;
}

.pagination>li {
  display: inline-block;
  list-style: none;
  text-align: center;
}

.pagination>li>a {
  display: block;
  color: hsla(0, 0%, 20%, 1);
  text-decoration: none;
  border: 1px solid hsla(0, 0%, 80%, 1);
  background-color: hsla(0, 0%, 96%, 1);
  padding: 0.4em 1em;
  width: 80px;
}

.pagination>li>a:hover {
  background-color: hsla(0, 0%, 88%, 1);
}

.pagination>li>a:active {
  background-color: hsla(0, 0%, 84%, 1);
}
</style>
