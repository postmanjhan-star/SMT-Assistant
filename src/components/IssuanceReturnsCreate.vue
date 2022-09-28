<script setup lang="ts">
import { NA, NBreadcrumb, NBreadcrumbItem, NButton, NForm, NFormItemGi, NGrid, NH1, NInput, NInputNumber, NSpace, useMessage } from 'naive-ui';
import { ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { ApiError, IssuanceReturnCreate, IssuanceReturnRead, IssuancesService, MaterialInventoriesService, MaterialInventoryRead, OpenAPI } from '../client';
import { useAuthStore } from '../stores/auth';



const message = useMessage();
const router = useRouter();

const authStore = useAuthStore();
OpenAPI.TOKEN = JSON.parse( authStore.accountToken )[ 'access_token' ];

const issuanceReturnCreationFormValue = ref( {
  materialInventoryIdno: '',
  returnQuantity: 0,
} );


const loadingRef = ref( false );

async function onClickCreateIssuanceReturnButton ( event: Event ) {
  loadingRef.value = true;

  let inventory: MaterialInventoryRead;

  if ( !!issuanceReturnCreationFormValue.value.materialInventoryIdno.trim() === false ) {
    message.error( '請輸入單包代碼' );
    loadingRef.value = false;
    return false;
  }

  // Check if the inventory exists
  try { inventory = await MaterialInventoriesService.getMaterialInventory( { materialInventoryIdno: issuanceReturnCreationFormValue.value.materialInventoryIdno.trim() } ) }
  catch ( error ) {
    if ( error instanceof ApiError && error.status === 404 ) {
      message.error( '無此包' );
      loadingRef.value = false;
      return false;
    }
  }

  // Build issuance return body
  const issuanceReturnCreate: IssuanceReturnCreate = {
    material_inventory_idno: inventory.idno,
    return_quantity: issuanceReturnCreationFormValue.value.returnQuantity,
  };

  // Create issuance return
  let issuanceReturn: IssuanceReturnRead;
  try { issuanceReturn = await IssuancesService.createIssuanceReturn( { requestBody: issuanceReturnCreate } ); }
  catch ( error ) {
    message.error( '建立失敗' );
    loadingRef.value = false;
    return false;
  }

  message.success( `發料退回單 ${ issuanceReturn.idno } 建立成功` );
  router.push( '/issuance_returns' );
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
        <router-link to="/issuance_returns" #=" { navigate, href } " custom>
          <n-a :href=" href " @click=" navigate ">發料退回作業</n-a>
        </router-link>
      </n-breadcrumb-item>
      <n-breadcrumb-item>建立發料退回單</n-breadcrumb-item>
    </n-breadcrumb>

    <div style="padding: 1rem;">
      <n-h1 prefix="bar" style="font-size: 1.4rem;">建立發料退回單</n-h1>
      <n-space vertical size="large"
        style="background-color: white; padding: 1rem; box-shadow: 0px 4px 20px -4px hsla(0, 0%, 60%, 0.4)">

        <n-form size="large" :model=" issuanceReturnCreationFormValue ">
          <n-grid cols="1 s:2" responsive="screen" x-gap="20">

            <n-form-item-gi label="物料單包代碼">
              <n-input v-model:value.lazy=" issuanceReturnCreationFormValue.materialInventoryIdno "></n-input>
            </n-form-item-gi>

            <n-form-item-gi label="退回數量">
              <n-input-number v-model:value.lazy=" issuanceReturnCreationFormValue.returnQuantity "
                :show-button=" false " style="width: 100%;" :min=" 0 " :precision=" 0 " :default-value=" 0 ">
              </n-input-number>
            </n-form-item-gi>

            <n-form-item-gi span="2">
              <n-button type="primary" block @click=" onClickCreateIssuanceReturnButton( $event ) " attr-type="submit"
                :loading=" loadingRef ">建立發料退回單</n-button>
            </n-form-item-gi>

          </n-grid>
        </n-form>
      </n-space>
    </div>
  </main>
</template>
