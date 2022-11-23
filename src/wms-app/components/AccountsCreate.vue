<script setup lang="ts">
import { FormInst, FormRules, NA, NBreadcrumb, NBreadcrumbItem, NButton, NForm, NFormItem, NH1, NInput, NSpace, useMessage } from 'naive-ui';
import { ref } from 'vue';
import { RouterLink } from 'vue-router';
import { AccountsService, ApiError, EmployeeAccountCreate, OpenAPI } from '../../client';
import { useAuthStore } from '../../stores/auth';


const message = useMessage();
const authStore = useAuthStore();
OpenAPI.TOKEN = JSON.parse( authStore.accountToken )[ 'access_token' ];
const formValue = ref<EmployeeAccountCreate>( { username: '', password: '' } );
const formRef = ref<FormInst | null>( null );

const rules: FormRules = {
  username: { required: true, message: '請输入帳號', trigger: [ 'blur' ] },
  password: { required: true, message: '請输入密碼', trigger: [ 'input', 'blur' ] }
};

async function createAccount ( newAccountData: EmployeeAccountCreate ) {
  try {
    const response = await AccountsService.createEmployeeAccount( { requestBody: newAccountData } );
    message.success( `${ response.username } 建立成功` );
  } catch ( error ) {
    if ( error instanceof ApiError && error.status === 409 ) { message.error( '帳號已存在，無法再次建立' ); }
    else { throw error; }
  }
}

async function handleCreateAccountButtonClick ( event: Event ) {
  formRef.value?.validate( async ( errors ) => {
    if ( !errors ) { createAccount( formValue.value ); }
    else { message.error( '請輸入帳號密碼' ); }
  } );
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
      <n-breadcrumb-item>系統管理</n-breadcrumb-item>
      <n-breadcrumb-item>
        <router-link to="/wms/accounts" #=" { navigate, href } " custom>
          <n-a :href=" href " @click=" navigate ">帳號管理</n-a>
        </router-link>
      </n-breadcrumb-item>
      <n-breadcrumb-item>建立新帳號</n-breadcrumb-item>
    </n-breadcrumb>

    <div style="padding: 1rem;">
      <n-h1 prefix="bar" style="font-size: 1.4rem;">建立新帳號</n-h1>
      <n-space vertical size="large"
        style="background-color: white; padding: 1rem; box-shadow: 0px 4px 20px -4px hsla(0, 0%, 60%, 0.4)">
        <n-form size="large" :model=" formValue " :rules=" rules " ref="formRef">
          <n-form-item show-require-mark autofocus label="帳號" path="username">
            <n-input v-model:value.lazy=" formValue.username " autofocus :input-props=" { autocomplete: 'username' } ">
            </n-input>
          </n-form-item>
          <n-form-item show-require-mark label="密碼" path="password">
            <n-input type="password" v-model:value.lazy=" formValue.password "
              :input-props=" { autocomplete: 'new-password' } "></n-input>
          </n-form-item>
          <n-form-item>
            <n-button type="primary" block @click=" handleCreateAccountButtonClick( $event ) " attr-type="submit">建立新帳號
            </n-button>
          </n-form-item>
        </n-form>
      </n-space>
    </div>
  </main>
</template>


<style scoped>
</style>
