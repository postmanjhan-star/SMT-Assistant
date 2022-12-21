<script setup lang="ts">
import { FormInst, FormRules, NA, NBreadcrumb, NBreadcrumbItem, NButton, NForm, NFormItemGi, NGrid, NH1, NInput, NSelect, NSpace, SelectGroupOption, SelectOption, useMessage } from 'naive-ui';
import { onBeforeMount, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { AccountsService, ApiError, EmployeeAccountRead, EmployeeAccountUpdate, EmployeeRoleEnum, OpenAPI } from '../../client';
import { useAuthStore } from '../../stores/auth';

const message = useMessage();

const authStore = useAuthStore();
OpenAPI.TOKEN = JSON.parse( authStore.accountToken )[ 'access_token' ];

const router = useRouter()
const route = useRoute()

const currentValue = ref<EmployeeAccountRead>( { username: '', full_name: '', idno: '', roles: [] } );
const uiFormValue = ref( { username: '', full_name: '', idno: '', roles: [] as EmployeeRoleEnum[], password: '' } );
const updateValue = ref<EmployeeAccountUpdate>( { full_name: '', password: '', roles: [] } );

const formRef = ref<FormInst | null>( null );
const rules: FormRules = {};

const role_options: Array<SelectOption | SelectGroupOption> = [
  { label: '一般用戶', value: 'NORMAL' },
  { label: '管理員', value: 'ADMIN' },
  { label: '系統管理員', value: 'SYSTEM_ADMIN', disabled: true },
]

onBeforeMount( async () => {
  try {
    currentValue.value = await AccountsService.getAccountEmployeeInformation( { idno: route.params.idno.toString() } );
    uiFormValue.value.username = currentValue.value.username;
    uiFormValue.value.idno = currentValue.value.idno;
    uiFormValue.value.full_name = currentValue.value.full_name;
    uiFormValue.value.roles = currentValue.value.roles;
  } catch ( error ) { if ( error instanceof ApiError && error.status === 404 ) { router.push( '/http-status/404' ); } }

} );

async function handleCreateAccountButtonClick ( event: Event ) {
  updateValue.value.full_name = uiFormValue.value.full_name;
  if ( uiFormValue.value.password ) updateValue.value.password = uiFormValue.value.password;
  updateValue.value.roles = uiFormValue.value.roles;

  try {
    const response = await AccountsService.updateAccountEmployee( { idno: route.params.idno.toString(), requestBody: updateValue.value } )
    message.success( '更新成功' )
  } catch ( error ) { message.error( '更新失敗' ) }
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
      <n-breadcrumb-item>{{ $route.params.idno }}</n-breadcrumb-item>
    </n-breadcrumb>

    <div style="padding: 1rem;">
      <n-h1 prefix="bar" style="font-size: 1.4rem;">帳號 {{ $route.params.idno }}</n-h1>
      <n-space vertical size="large"
        style="background-color: white; padding: 1rem; box-shadow: 0px 4px 20px -4px hsla(0, 0%, 60%, 0.4)">
        <n-form size="large" :model=" uiFormValue " :rules=" rules " ref="formRef">
          <n-grid cols="1 s:2" responsive="screen" x-gap="20">

            <n-form-item-gi label="帳號" path="username">
              <n-input v-model:value.lazy=" uiFormValue.username " :disabled=" true "></n-input>
            </n-form-item-gi>

            <n-form-item-gi label="工號" path="idno">
              <n-input v-model:value.lazy=" uiFormValue.idno " :disabled=" true "></n-input>
            </n-form-item-gi>

            <n-form-item-gi label="姓名" path="full_name">
              <n-input v-model:value.lazy=" uiFormValue.full_name " :input-props=" { autocomplete: 'name' } "></n-input>
            </n-form-item-gi>

            <n-form-item-gi label="新密碼" path="full_name">
              <n-input v-model:value.lazy=" uiFormValue.password " type="password"
                :input-props=" { autocomplete: 'new-password' } "></n-input>
            </n-form-item-gi>

            <n-form-item-gi label="權限" path="roles" span="2">
              <n-select v-model:value.lazy=" uiFormValue.roles " multiple :options=" role_options "></n-select>
            </n-form-item-gi>

            <n-form-item-gi span="2">
              <n-button type="primary" block @click=" handleCreateAccountButtonClick( $event ) " attr-type="submit">更新
              </n-button>
            </n-form-item-gi>

          </n-grid>

        </n-form>
      </n-space>
    </div>
  </main>
</template>
