<script setup lang="ts">
import { ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { NBreadcrumb, NBreadcrumbItem } from 'naive-ui';
import { NA, NH1 } from 'naive-ui';
import { NSpace } from 'naive-ui';
import { NForm, NFormItemGi, NInput, NButton, NGrid, NDynamicInput } from 'naive-ui';
import { FormRules, FormInst } from 'naive-ui';
import { useMessage } from 'naive-ui';
import { useAuthStore } from '../stores/auth';
import { ApiError, OpenAPI } from '../client';
import { StorageCreate, StoragesService } from '../client';

const router = useRouter();
const message = useMessage();

const authStore = useAuthStore();
OpenAPI.TOKEN = JSON.parse( authStore.accountToken )[ 'access_token' ];

const formRef = ref<FormInst | null>( null );
const formValue = ref<StorageCreate>( { idno: '', name: '', l2_storages: [] } );
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

const l2FormValue = ref( [ { key: '', value: '' } ] )

async function handleCreateStorageButtonClick ( event ) {
  // Convert all values to uppercase
  formValue.value.idno = formValue.value.idno.toUpperCase();
  formValue.value.name = formValue.value.name.toUpperCase();

  l2FormValue.value.forEach( ( l2Value, index ) => {
    l2FormValue.value[ index ].key = l2Value.key.toUpperCase();
    l2FormValue.value[ index ].value = l2Value.value.toUpperCase();
  } )

  // Check if formValue.l2_storages has duplicate keys
  const keyArr = l2FormValue.value.map( ( item ) => item.key );
  const isDuplicate = keyArr.some( ( key, index ) => keyArr.indexOf( key ) != index )
  if ( isDuplicate ) {
    message.error( '代碼不可重複' );
    return false;
  }

  // Copy l2FormValue to formValue
  for ( let l2FormEntry of l2FormValue.value ) {
    formValue.value.l2_storages.push( { idno: l2FormEntry.key, name: l2FormEntry.value } )
  }

  // Check if any empyt fields
  formRef.value?.validate( async ( error ) => {
    if ( error ) {
      message.error( '請輸入必填爛位' );
      return false;
    }
  } );

  // Check if formValue.l2_storages has values
  let l2StorageValidate = formValue.value.l2_storages.every( ( currentValue, index, array ) => {
    if ( !!currentValue.idno && !!currentValue.name ) { return true; } else { return false; }
  } );

  if ( !l2StorageValidate ) {
    formValue.value.l2_storages = [];
    message.error( '請建立儲位' );
    return false;
  }

  // Send request to backend, and redirect to /storages
  try {
    const response = await StoragesService.createStorage( formValue.value )
    message.success( `倉位 ${ response.idno } 建立成功` );
    router.push( '/storages' );
  } catch ( error ) {
    if ( error instanceof ApiError ) {
      if ( error.status === 409 ) {
        message.error( '倉位已存在，無法重複建立' );
      } else { throw error; }
    } else {
      message.error( '建立失敗' );
      throw error;
    }
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
      <n-breadcrumb-item>建立倉位</n-breadcrumb-item>
    </n-breadcrumb>

    <div style="padding: 1rem;">
      <n-h1 prefix="bar" style="font-size: 1.4rem;">建立倉位</n-h1>
      <n-space vertical size="large"
        style="background-color: white; padding: 1rem; box-shadow: 0px 4px 20px -4px hsla(0, 0%, 60%, 0.4)">
        <n-form size="large" :model=" formValue " :rules=" rules " ref="formRef">
          <n-grid cols="1 s:2" responsive="screen" x-gap="20">

            <n-form-item-gi show-require-mark label="倉位代碼" path="idno" autofocus>
              <n-input v-model:value.lazy=" formValue.idno " autofocus
                :input-props=" { style: 'text-transform: uppercase;' } ">
              </n-input>
            </n-form-item-gi>

            <n-form-item-gi show-require-mark label="倉位名稱" path="name">
              <n-input v-model:value.lazy=" formValue.name " :input-props=" { style: 'text-transform: uppercase;' } ">
              </n-input>
            </n-form-item-gi>

            <n-form-item-gi span="2">
              <fieldset
                style="width: 100%; border: 1px solid hsla(0, 0%, 86%, 1.0); border-radius: 4px; padding: 1rem;">
                <legend>儲位</legend>
                <n-dynamic-input :min=" 1 " preset="pair" key-placeholder="儲位代碼" value-placeholder="儲位名稱"
                  v-model:value.lazy=" l2FormValue " key-field="idno">
                </n-dynamic-input>
              </fieldset>
            </n-form-item-gi>

            <n-form-item-gi span="2">
              <n-button type="primary" block @click=" handleCreateStorageButtonClick( $event ) " attr-type="submit">
                建立倉位
              </n-button>
            </n-form-item-gi>

          </n-grid>
        </n-form>
      </n-space>
    </div>
  </main>
</template>

<style>
.n-dynamic-input-preset-pair input {
  text-transform: uppercase;
}
</style>
