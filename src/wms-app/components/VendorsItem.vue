<script setup lang="ts">
import { FormInst, FormRules, NButton, NInput, NSpace, useMessage } from 'naive-ui';
import { onBeforeMount, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ApiError, OpenAPI, VendorsService, VendorUpdate } from '../../client';
import { useAuthStore } from '../../stores/auth';

const authStore = useAuthStore();
OpenAPI.TOKEN = JSON.parse( authStore.accountToken )[ 'access_token' ];

const message = useMessage();
const router = useRouter();
const route = useRoute();

const formRef = ref<FormInst | null>( null );
const formValue = ref<VendorUpdate>( { id: 0, idno: '', name: '', tax_idno: '' } );
const rules: FormRules = {
  idno: {
    required: true,
    message: '請输入供應商代碼',
    trigger: [ 'blur' ],
  },
  name: {
    required: true,
    message: '請输入供應商名稱',
    trigger: [ 'input', 'blur' ],
  },
}
onBeforeMount( async () => { formValue.value = await VendorsService.getVendor( { idno: route.params.idno.toString() } ); } );

async function handleCreateVendorButtonClick ( evnet: Event ) {
  // Check if any empyt fields
  try {
    await formRef.value?.validate( async ( error ) => { if ( error ) { throw error; } } );
  } catch ( error ) {
    message.error( '請輸入必填爛位' );
    return false;
  }

  // Convert `idno` to uppercase
  formValue.value.idno = formValue.value.idno.toUpperCase();

  // Update
  try {
    const response = await VendorsService.updateVendor( { id: formValue.value.id, requestBody: formValue.value } );
    message.success( `更新成功` );
    router.push( '/wms/vendors' );
  } catch ( error ) {
    if ( error instanceof ApiError && error.status === 409 ) { message.error( '供應商代碼已存在，請重新命名' ); }
    else { message.error( '更新失敗' ); }
  }
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
      <n-breadcrumb-item>基本資料管理</n-breadcrumb-item>
      <n-breadcrumb-item>
        <router-link to="/wms/vendors" #=" { navigate, href } " custom>
          <n-a :href=" href " @click=" navigate ">供應商管理</n-a>
        </router-link>
      </n-breadcrumb-item>
      <n-breadcrumb-item>{{ $route.params.idno.toString().toUpperCase() }}</n-breadcrumb-item>
    </n-breadcrumb>

    <div style="padding: 1rem;">
      <n-h1 prefix="bar" style="font-size: 1.4rem;">供應商 {{ $route.params.idno.toString().toUpperCase() }}</n-h1>
      <n-space vertical size="large"
        style="background-color: white; padding: 1rem; box-shadow: 0px 4px 20px -4px hsla(0, 0%, 60%, 0.4)">
        <n-form size="large" :model=" formValue " :rules=" rules " ref="formRef">
          <n-grid cols="1 s:3" responsive="screen" x-gap="20">

            <n-form-item-gi show-require-mark label="供應商代碼" path="idno" autofocus>
              <n-input v-model:value.lazy=" formValue.idno " autofocus
                :input-props=" { style: 'text-transform: uppercase;' } "></n-input>
            </n-form-item-gi>

            <n-form-item-gi show-require-mark label="供應商名稱" path="name">
              <n-input v-model:value.lazy=" formValue.name "></n-input>
            </n-form-item-gi>

            <n-form-item-gi label="供應商統一編號" path="tax_idno">
              <n-input v-model:value.lazy=" formValue.tax_idno "></n-input>
            </n-form-item-gi>

            <n-form-item-gi span="3">
              <n-button type="primary" block @click=" handleCreateVendorButtonClick( $event ) " attr-type="submit">
                更新供應商
              </n-button>
            </n-form-item-gi>

          </n-grid>
        </n-form>
      </n-space>
    </div>
  </main>
</template>

<style>
</style>
