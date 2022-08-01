<script setup lang="ts">
import { FormInst, FormRules, NA, NBreadcrumb, NBreadcrumbItem, NButton, NForm, NFormItemGi, NGrid, NH1, NInput, NInputNumber, NSelect, NSpace, useMessage } from 'naive-ui';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { ApiError, MaterialCreate, MaterialsService, OpenAPI, StErpService, UnitEnum } from '../client';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
OpenAPI.TOKEN = JSON.parse( authStore.accountToken )[ 'access_token' ];

const message = useMessage();
const router = useRouter();

const formRef = ref<FormInst | null>( null );
const formValue = ref<MaterialCreate>( {
  idno: '',
  name: '',
  description: '',
  unit: 'PIECE' as UnitEnum,
  qty_per_pack: 1,
  expiry_days: 365,
} );

const unit_options = [
  { label: 'PIECE', value: 'PIECE' },
  { label: 'ROLL', value: 'ROLL' },
  { label: 'PLATE', value: 'PLATE' },
  { label: 'CM', value: 'CM' },
  { label: 'BOX', value: 'BOX' },
  { label: 'PACK', value: 'PACK' },
  { label: 'SHEET', value: 'SHEET' },
  { label: 'BAG', value: 'BAG' },
]

const rules: FormRules = {
  idno: { required: true, message: '請输入物料代碼', trigger: [ 'blur' ] },
  name: { required: true, message: '請输入物料名稱', trigger: [ 'input', 'blur' ] },
  unit: { required: true, message: '請输入基本單位', trigger: [ 'input', 'blur' ] },
  qty_per_pack: { required: true, message: '請输入基本包裝量', trigger: [ 'input', 'blur' ] },
  expiry_days: { required: true, message: '請输入有效期間', trigger: [ 'input', 'blur' ] },
}


async function handleCreateMaterialButtonClick ( evnet: Event ) {
  // Check if any empyt fields
  try {
    await formRef.value?.validate( async ( error ) => { if ( error ) { throw error; } } );
  } catch ( error ) {
    message.error( '請輸入必填爛位' );
    return false;
  }

  // Convert `idno` to uppercase
  formValue.value.idno = formValue.value.idno.toUpperCase();

  // Create Material
  try {
    const response = await MaterialsService.createMaterial( formValue.value )
    message.success( `物料 ${ response.idno } 建立成功` );
    router.push( '/materials' );
  } catch ( error ) {
    if ( error instanceof ApiError && error.status === 409 ) { message.error( '物料代碼已存在，請重新命名' ); }
    else { message.error( '建立失敗' ); }
  }
}


const loadingRef = ref( false );
const loading = loadingRef;

async function handleImportFromStErpButtonClick ( event: Event ) {
  loadingRef.value = true;
  if ( formValue.value.idno === '' ) {
    message.error( '請輸入物料代碼' );
    loadingRef.value = false;
    return false;
  }
  try {
    const response = await StErpService.getStPart( formValue.value.idno );
    formValue.value.idno = response.idno;
    formValue.value.name = response.spec_1;
    formValue.value.description = response.spec_2;
    formValue.value.qty_per_pack = response.qty_per_pack;
  } catch ( error ) {
    if ( error instanceof ApiError && error.status === 404 ) { message.error( '舊 ERP 無此零件' ); }
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
      <n-breadcrumb-item>物料管理</n-breadcrumb-item>
      <n-breadcrumb-item>
        <router-link to="/materials" #=" { navigate, href } " custom>
          <n-a :href=" href " @click=" navigate ">物料管理</n-a>
        </router-link>
      </n-breadcrumb-item>
      <n-breadcrumb-item>建立物料</n-breadcrumb-item>
    </n-breadcrumb>

    <div style="padding: 1rem;">
      <n-h1 prefix="bar" style="font-size: 1.4rem;">建立物料</n-h1>
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

            <n-form-item-gi show-require-mark label="物料代碼" path="idno" autofocus>
              <n-input v-model:value.lazy=" formValue.idno " autofocus
                :input-props=" { style: 'text-transform: uppercase;' } "></n-input>
            </n-form-item-gi>

            <n-form-item-gi show-require-mark label="物料名稱" path="name">
              <n-input v-model:value.lazy=" formValue.name "></n-input>
            </n-form-item-gi>

            <n-form-item-gi label="物料說明" path="description">
              <n-input v-model:value.lazy=" formValue.description "></n-input>
            </n-form-item-gi>

            <n-form-item-gi show-require-mark label="基本單位" path="unit">
              <n-select v-model:value.lazy=" formValue.unit " :options=" unit_options "></n-select>
            </n-form-item-gi>

            <n-form-item-gi show-require-mark label="基本包裝量">
              <n-input-number v-model:value.lazy=" formValue.qty_per_pack " :show-button=" false " :min=" 1 "
                :precision=" 0 " :default-value=" 1 "></n-input-number>
            </n-form-item-gi>

            <n-form-item-gi show-require-mark label="有效期間">
              <n-input-number v-model:value.lazy=" formValue.expiry_days " :show-button=" false " :min=" 1 "
                :precision=" 0 " :default-value=" 365 "><template #suffix>日</template></n-input-number>
            </n-form-item-gi>

            <n-form-item-gi span="3">
              <n-button type="primary" block @click=" handleCreateMaterialButtonClick( $event ) " attr-type="submit">
                建立物料
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
