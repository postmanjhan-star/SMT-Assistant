<script setup lang="ts">
import { FormInst, FormRules, NButton, NInput, NSpace, useMessage } from 'naive-ui';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { ApiError, OpenAPI, StErpService, VendorCreate, VendorsService } from '../client';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
OpenAPI.TOKEN = JSON.parse( authStore.accountToken )[ 'access_token' ];

const message = useMessage();
const router = useRouter();

const formRef = ref<FormInst | null>( null );
const formValue = ref<VendorCreate>( { idno: '', name: '', tax_idno: '' } );
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

async function handleCreateVendorButtonClick ( evnet: Event ) {
  // Check if any empyt fields
  try {
    await formRef.value?.validate( async ( error ) => {
      if ( error ) { throw error; }
    } );
  } catch ( error ) {
    message.error( '請輸入必填爛位' );
    return false;
  }

  // Convert `idno` to uppercase
  formValue.value.idno = formValue.value.idno.toUpperCase();

  // Create
  try {
    const response = await VendorsService.createVendor( formValue.value )
    message.success( `供應商 ${ response.idno } 建立成功` );
    router.push( '/vendors' );
  } catch ( error ) {
    if ( error instanceof ApiError && error.status === 409 ) { message.error( '供應商代碼已存在，請重新命名' ); }
    else { message.error( '建立失敗' ); }
  }
}

const loadingRef = ref( false );
const loading = loadingRef;

async function handleImportFromStErpButtonClick ( event: Event ) {
  loadingRef.value = true;
  if ( formValue.value.idno === '' ) {
    message.error( '請輸入供應商代碼' );
    loadingRef.value = false;
    return false;
  }
  try {
    const response = await StErpService.getStVendor( formValue.value.idno );
    formValue.value.idno = response.idno;
    formValue.value.name = response.name;
    formValue.value.tax_idno = response.tax_idno;
  } catch ( error ) {
    if ( error instanceof ApiError && error.status === 404 ) { message.error( '舊 ERP 無此供應商' ); }
    else { message.error( '匯入失敗' ); }
  } finally { loadingRef.value = false; }
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
      <n-breadcrumb-item>採購管理</n-breadcrumb-item>
      <n-breadcrumb-item>
        <router-link to="/vendors" #=" { navigate, href } " custom>
          <n-a :href=" href " @click=" navigate ">供應商管理</n-a>
        </router-link>
      </n-breadcrumb-item>
      <n-breadcrumb-item>建立供應商</n-breadcrumb-item>
    </n-breadcrumb>

    <div style="padding: 1rem;">
      <n-h1 prefix="bar" style="font-size: 1.4rem;">建立供應商</n-h1>
      <n-space vertical size="large"
        style="background-color: white; padding: 1rem; box-shadow: 0px 4px 20px -4px hsla(0, 0%, 60%, 0.4)">

        <n-space size="large">
          <n-button type="primary" secondary strong size="large" @click=" handleImportFromStErpButtonClick( $event ) "
            attr-type="button" :loading=" loading ">
            從舊 ERP 匯入
          </n-button>
        </n-space>

        <n-form size="large" :model=" formValue " :rules=" rules " ref="formRef">
          <n-grid cols="1 s:3" responsive="screen" x-gap="20">

            <n-form-item-gi show-require-mark label="供應商代碼" path="idno" autofocus>
              <n-input v-model:value.lazy=" formValue.idno " autofocus
                :input-props=" { style: 'text-transform: uppercase;' } ">
              </n-input>
            </n-form-item-gi>

            <n-form-item-gi show-require-mark label="供應商名稱" path="name">
              <n-input v-model:value.lazy=" formValue.name "></n-input>
            </n-form-item-gi>

            <n-form-item-gi label="供應商統一編號" path="tax_idno">
              <n-input v-model:value.lazy=" formValue.tax_idno "></n-input>
            </n-form-item-gi>

            <n-form-item-gi span="3">
              <n-button type="primary" block @click=" handleCreateVendorButtonClick( $event ) " attr-type="submit">
                建立供應商
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
