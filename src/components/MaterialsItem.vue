<script setup lang="ts">
import { FormInst, FormRules, NButton, NInput, NInputNumber, NSpace, useMessage } from 'naive-ui';
import { onBeforeMount, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ApiError, MaterialsService, MaterialUpdate, OpenAPI } from '../client';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
OpenAPI.TOKEN = JSON.parse( authStore.accountToken )[ 'access_token' ];

const message = useMessage();
const router = useRouter();
const route = useRoute();

const formRef = ref<FormInst | null>( null );
const formValue = ref<MaterialUpdate>( { id: 0, idno: '', name: '', expiry_days: 0 } );
const rules: FormRules = {
  idno: {
    required: true,
    message: '請输入物料代碼',
    trigger: [ 'blur' ],
  },
  name: {
    required: true,
    message: '請输入物料名稱',
    trigger: [ 'input', 'blur' ],
  },
}
onBeforeMount( async () => {
  formValue.value = await MaterialsService.getMaterial( route.params.idno.toString() )
} );

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

  // Update Material
  try {
    const response = await MaterialsService.updateMaterial( formValue.value.id, formValue.value )
    message.success( `更新成功` );
    router.push( '/materials' );
  } catch ( error ) {
    if ( error instanceof ApiError && error.status === 409 ) { message.error( '物料代碼已存在，請重新命名' ); }
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
      <n-breadcrumb-item>{{ $route.params.idno.toString().toUpperCase() }}</n-breadcrumb-item>
    </n-breadcrumb>

    <div style="padding: 1rem;">
      <n-h1 prefix="bar" style="font-size: 1.4rem;">物料 {{ $route.params.idno.toString().toUpperCase() }}</n-h1>
      <n-space vertical size="large"
        style="background-color: white; padding: 1rem; box-shadow: 0px 4px 20px -4px hsla(0, 0%, 60%, 0.4)">
        <n-form size="large" :model=" formValue " :rules=" rules " ref="formRef">
          <n-grid cols="1 s:3" responsive="screen" x-gap="20">

            <n-form-item-gi show-require-mark label="物料代碼" path="idno" autofocus>
              <n-input v-model:value.lazy=" formValue.idno " autofocus
                :input-props=" { style: 'text-transform: uppercase;' } "> </n-input>
            </n-form-item-gi>

            <n-form-item-gi show-require-mark label="物料名稱" path="name">
              <n-input v-model:value.lazy=" formValue.name "></n-input>
            </n-form-item-gi>

            <n-form-item-gi show-require-mark label="有效期間">
              <n-input-number v-model:value.lazy=" formValue.expiry_days " :show-button=" false " :min=" 1 "
                :precision=" 0 ">
                <template #suffix> 日 </template>
              </n-input-number>
            </n-form-item-gi>

            <n-form-item-gi span="3">
              <n-button type="primary" block @click=" handleCreateMaterialButtonClick( $event ) " attr-type="submit">
                更新物料
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
