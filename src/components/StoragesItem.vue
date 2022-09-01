<script setup lang="ts">
import { FormInst, FormRules, NA, NBreadcrumb, NBreadcrumbItem, NButton, NForm, NFormItemGi, NGrid, NH1, NInput, NSpace, useMessage } from 'naive-ui';
import { onBeforeMount, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { ApiError, L1StorageUpdate, OpenAPI, StoragesService } from '../client';
import { useAuthStore } from '../stores/auth';
import StorageSubItem from "./StoragesSubItem.vue";

const route = useRoute();
const router = useRouter();
const message = useMessage();

const authStore = useAuthStore();
OpenAPI.TOKEN = JSON.parse( authStore.accountToken )[ 'access_token' ];

const formRef = ref<FormInst | null>( null );
const formValue = ref<L1StorageUpdate>( { id: 0, idno: '', name: '' } );
const rules: FormRules = {
  idno: {
    required: true,
    message: '請输入倉位代碼',
    trigger: [ 'blur' ],
  },
  name: {
    required: true,
    message: '請输入倉位名稱',
    trigger: [ 'input', 'blur' ],
  },
}


onBeforeMount( async () => { formValue.value = await StoragesService.getStorage( { l1Id: Number( route.params.id ) } ); } );


async function handleUpdateStorageButtonClick ( event: Event ) {
  // Check if any empyt fields
  try {
    await formRef.value?.validate( async ( error ) => { if ( error ) { throw error; } } );
  } catch ( error ) {
    message.error( '請輸入必填爛位' );
    return false;
  }

  // Convert all values to uppercase
  formValue.value.idno = formValue.value.idno.toUpperCase();
  formValue.value.name = formValue.value.name.toUpperCase();

  // Send request to backend
  try {
    const response = await StoragesService.updateL1Storage( { l1Id: formValue.value.id, requestBody: formValue.value } );
    message.success( `更新成功` );
    router.push( '/storages' );

  } catch ( error ) {
    if ( error instanceof ApiError && error.status === 409 ) { message.error( '同名倉位已存在，請重新命名' ); }
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
        <router-link to="/storages" #=" { navigate, href } " custom>
          <n-a :href=" href " @click=" navigate ">倉位管理</n-a>
        </router-link>
      </n-breadcrumb-item>
      <n-breadcrumb-item>{{ formValue.idno.toUpperCase() }}</n-breadcrumb-item>
    </n-breadcrumb>

    <div style="padding: 1rem;">
      <n-h1 prefix="bar" style="font-size: 1.4rem;">倉位 {{ formValue.idno.toUpperCase() }}</n-h1>
      <n-space vertical size="large"
        style="background-color: white; padding: 1rem; box-shadow: 0px 4px 20px -4px hsla(0, 0%, 60%, 0.4)">
        <n-form size="large" :model=" formValue " :rules=" rules " ref="formRef">
          <n-grid cols="1 s:2" responsive="screen" x-gap="20">

            <n-form-item-gi show-require-mark label="倉位代碼" path="idno">
              <n-input v-model:value.lazy=" formValue.idno " :input-props=" { style: 'text-transform: uppercase;' } ">
              </n-input>
            </n-form-item-gi>

            <n-form-item-gi show-require-mark label="倉位名稱" path="name">
              <n-input v-model:value.lazy=" formValue.name " :input-props=" { style: 'text-transform: uppercase;' } ">
              </n-input>
            </n-form-item-gi>

            <n-form-item-gi span="2">
              <n-button type="primary" block @click=" handleUpdateStorageButtonClick( $event ) " attr-type="submit">
                更新倉位代碼、名稱
              </n-button>
            </n-form-item-gi>

          </n-grid>
        </n-form>
      </n-space>
    </div>
    <storage-sub-item></storage-sub-item>
  </main>
</template>
