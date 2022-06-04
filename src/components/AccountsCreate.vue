<script setup lang="ts">
import { ref } from 'vue';
import { RouterLink } from 'vue-router';
import { NBreadcrumb, NBreadcrumbItem, NA, NH1, NSpace } from 'naive-ui';
import { NForm, NFormItem, NInput, NButton } from 'naive-ui';
import { useMessage } from 'naive-ui';
import { FormRules, FormInst } from 'naive-ui';
import { EmployeeAccountCreate, AccountsService, ApiError } from '../client';
import { OpenAPI } from '../opanApi';


const message = useMessage();
const formValue = ref<EmployeeAccountCreate>( { username: null, password: null } );
const formRef = ref<FormInst | null>( null );

const rules: FormRules = {
  username: {
    required: true,
    message: '请输入帳號',
    trigger: [ 'blur' ],
  },
  password: {
    required: true,
    message: '请输入密碼',
    trigger: [ 'input', 'blur' ],
  }
};

async function createAccount ( newAccountData: EmployeeAccountCreate ) {
  try {
    // console.debug( newAccountData );
    const response = await AccountsService.createEmployeeAccount( newAccountData )
    // console.debug( 'Response:\n', response );
    message.success( `${ response.username } 建立成功` );
  } catch ( error ) {
    if ( error instanceof ApiError ) {
      // console.error( 'Error status:\n', error.status );
      // console.error( 'Error status text: \n', error.statusText );
      if ( error.status === 409 ) {
        message.error( '帳號已存在，無法再次建立' );
      } else { throw error; }
    } else { throw error; }
  }
}

async function handleCreateAccountButtonClick ( event: Event ) {
  formRef.value?.validate( async ( errors ) => {
    if ( !errors ) {
      createAccount( formValue.value );
    } else {
      message.error( '請輸入帳號密碼' );
    }
  } );
}
</script>


<template>
  <main
    style="min-height: calc(100vh - 60px); background-color: hsla(0, 0%, 92%, 1.0); background-image: url('/pattern.svg'); background-repeat: repeat-x; background-position: center; background-size: cover;">
    <n-breadcrumb
      style="padding: 1rem; box-shadow: 0px 4px 20px -4px hsla(0, 0%, 60%, 0.4); position: relative; background-color: white; z-index: 1;">
      <n-breadcrumb-item>
        <router-link to="/home" #=" { navigate, href } " custom>
          <n-a :href=" href " @click=" navigate ">首頁</n-a>
        </router-link>
      </n-breadcrumb-item>
      <n-breadcrumb-item>系統管理</n-breadcrumb-item>
      <n-breadcrumb-item>
        <router-link to="/accounts" #=" { navigate, href } " custom>
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
