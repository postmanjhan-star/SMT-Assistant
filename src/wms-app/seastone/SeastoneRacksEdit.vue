<script setup lang="ts">
import { Validator } from 'ip-num/Validator'
import { FormInst, FormItemRule, FormRules, NA, NBreadcrumb, NBreadcrumbItem, NButton, NForm, NFormItemGi, NGrid, NH1, NInput, NSpace, useMessage } from 'naive-ui'
import { onBeforeMount, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ApiError, OpenAPI, SeastoneService, SeastoneSmartRackReadWithChildren, SeastoneSmartRackUpdate } from '../../client/index'
import { useAuthStore } from '../../stores/auth'

const message = useMessage();

const authStore = useAuthStore();
OpenAPI.TOKEN = JSON.parse( authStore.accountToken )[ 'access_token' ];

const router = useRouter();
const route = useRoute();
const formRef = ref<FormInst | null>( null );

const rack = ref<SeastoneSmartRackReadWithChildren>( {
  id: 0,
  rack_idno: '',
  server_address: '',
  wifi_ip: '',
  wifi_mac: '',
  eth_ip: '',
  eth_mac: '',
  dev_id: '',
} );

const formValue = ref<SeastoneSmartRackUpdate>( {
  rack_idno: '',
  server_address: '',
  wifi_ip: '',
  wifi_mac: '',
  eth_ip: '',
  eth_mac: '',
  dev_id: '',
} )



function validateIp ( ip: string ) {
  let ipCheckResult = Validator.isValidIPv4String( ip )
  if ( ipCheckResult[ 0 ] === false ) { ipCheckResult = Validator.isValidIPv6String( ip ) }
  if ( ipCheckResult[ 0 ] === false ) { throw Error }
}



const rules: FormRules = {
  server_address: {
    required: true,
    message: '請输入服務主機位址',
    trigger: [ 'blur' ],
    validator: ( rule: FormItemRule, value: string ) => {
      try {
        const serverUrl = new URL( value )
        return true
      } catch ( error ) { return false }
    }
  },
  rack_idno: { required: true, message: '請输入料架代碼', trigger: [ 'input', 'blur' ] },
  wifi_mac: { required: true, message: '請输入 Wi-Fi MAC 位址', trigger: [ 'input', 'blur' ] },
  eth_mac: { required: true, message: '請输入有線 MAC 位址', trigger: [ 'input', 'blur' ] },
  dev_id: { required: true, message: '請输入料架序號', trigger: [ 'input', 'blur' ] },
  eth_ip: {
    required: false,
    message: '請输入有線 IP 位址',
    trigger: [ 'input', 'blur' ],
    validator: ( rule: FormItemRule, value: string ) => {
      if ( value ) {
        try {
          validateIp( value )
          return true
        } catch ( error ) { return false }
      }
    },
  },
  wifi_ip: {
    required: false,
    message: '請输入 Wi-Fi IP 位址',
    trigger: [ 'input', 'blur' ],
    validator: ( rule: FormItemRule, value: string ) => {
      if ( value ) {
        try {
          validateIp( value )
          return true
        } catch ( error ) { return false }
      }
    },
  },
}

onBeforeMount( async () => {
  try {
    rack.value = await SeastoneService.getSeastoneSmartRack( { rackIdno: route.params.rack_idno.toString() } );
    formValue.value = rack.value
  } catch ( error ) { if ( error instanceof ApiError && error.status === 404 ) { router.push( '/http-status/404' ); } }
} );


async function onSubmitForm ( event: Event ) {
  // Check if any empyt fields
  try { await formRef.value?.validate( async ( error ) => { if ( error ) { throw error; } } ); }
  catch ( error ) {
    message.error( '請輸入必填爛位' );
    return false;
  }

  // Update Material
  try {
    const response = await SeastoneService.updateSeastoneSmartRack( { rackIdno: route.params.rack_idno.toString(), requestBody: formValue.value } )
    message.success( `更新成功` )
    router.push( '/wms/seastone_racks' )
  } catch ( error ) {
    if ( error instanceof ApiError && error.status === 409 ) { message.error( '物料代碼已存在，請重新命名' ) }
    else { message.error( '更新失敗' ) }
  }
}
</script>



<template>
  <main
    style="min-height: calc(100vh - 60px); background-color: hsla(0, 0%, 92%, 1.0); background-repeat: repeat-x; background-position: center; background-size: cover;">
    <n-breadcrumb
      style="padding: 1rem; box-shadow: 0px 4px 20px -4px hsla(0, 0%, 60%, 0.4); position: relative; background-color: white; z-index: 1; overflow: auto;">
      <n-breadcrumb-item>
        <router-link to="/wms/home" #=" { navigate, href } " custom>
          <n-a :href=" href " @click=" navigate ">首頁</n-a>
        </router-link>
      </n-breadcrumb-item>
      <n-breadcrumb-item>系統管理</n-breadcrumb-item>
      <n-breadcrumb-item>
        <router-link to="/wms/seastone_racks" #=" { navigate, href } " custom>
          <n-a :href=" href " @click=" navigate ">智慧料架管理</n-a>
        </router-link>
      </n-breadcrumb-item>
      <n-breadcrumb-item>
        <router-link :to=" `/wms/seastone_racks/${ $route.params.rack_idno.toString() }` " #=" { navigate, href } "
          custom>
          <n-a :href=" href " @click=" navigate ">{{ $route.params.rack_idno.toString() }}</n-a>
        </router-link>
      </n-breadcrumb-item>
    </n-breadcrumb>

    <div style="padding: 1rem;">
      <n-h1 prefix="bar" style="font-size: 1.4rem;"> {{ $route.params.rack_idno.toString() }} </n-h1>

      <n-space vertical size="large"
        style="background-color: white; padding: 1rem; box-shadow: 0px 4px 20px -4px hsla(0, 0%, 60%, 0.4)">

        <n-form size="large" :model=" formValue " :rules=" rules " ref="formRef"
          @submit:prevent=" onSubmitForm( $event ) ">
          <n-grid cols="1 s:2" responsive="screen" x-gap="20">

            <n-form-item-gi show-require-mark label="服務主機位址" path="server_address" autofocus>
              <n-input v-model:value.lazy=" formValue.server_address "></n-input>
            </n-form-item-gi>

            <n-form-item-gi show-require-mark label="料架代碼" path="rack_idno">
              <n-input v-model:value.lazy=" formValue.rack_idno "></n-input>
            </n-form-item-gi>

            <n-form-item-gi label="Wi-Fi IP 位址" path="wifi_ip">
              <n-input v-model:value.lazy=" formValue.wifi_ip "></n-input>
            </n-form-item-gi>

            <n-form-item-gi show-require-mark label="Wi-Fi MAC 位址" path="wifi_mac">
              <n-input v-model:value.lazy=" formValue.wifi_mac "></n-input>
            </n-form-item-gi>

            <n-form-item-gi label="有線 IP 位址" path="eth_ip">
              <n-input v-model:value.lazy=" formValue.eth_ip "></n-input>
            </n-form-item-gi>

            <n-form-item-gi show-require-mark label="有線 MAC 位址" path="eth_mac">
              <n-input v-model:value.lazy=" formValue.eth_mac "></n-input>
            </n-form-item-gi>

            <n-form-item-gi show-require-mark label="料架序號" path="dev_id">
              <n-input v-model:value.lazy=" formValue.dev_id "></n-input>
            </n-form-item-gi>

            <n-form-item-gi span="2">
              <n-button type="primary" block @click=" onSubmitForm( $event ) " attr-type="submit">
                更新
              </n-button>
            </n-form-item-gi>

          </n-grid>
        </n-form>

      </n-space>


    </div>
  </main>
</template>



<style>
main {
  background-image: url('/pattern.svg');
}
</style>
