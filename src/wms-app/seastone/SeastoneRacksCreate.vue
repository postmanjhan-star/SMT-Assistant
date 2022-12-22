<script setup lang="ts">
import { Validator } from 'ip-num/Validator'
import { FormInst, FormItemRule, FormRules, NA, NBreadcrumb, NBreadcrumbItem, NButton, NForm, NFormItemGi, NGrid, NH1, NInput, NSelect, NSpace, NText, SelectGroupOption, SelectOption, useMessage } from 'naive-ui'
import { h, onBeforeMount, ref, VNodeChild } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { ApiError, OpenAPI, SeastoneService, SeastoneSmartRackCreate, StorageRead, StoragesService, StorageTypeEnum } from '../../client/index'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const message = useMessage()
const authStore = useAuthStore()
OpenAPI.TOKEN = JSON.parse( authStore.accountToken )[ 'access_token' ]
const formValue = ref<SeastoneSmartRackCreate>( { l1_storage_id: 1, server_address: '', rack_idno: '', wifi_mac: '', eth_mac: '', dev_id: '' } )
const formRef = ref<FormInst | null>( null )

const storageL1List = ref<StorageRead[]>( [] )

const storageL1SelectOptions = ref<Array<SelectOption | SelectGroupOption>>( [] )


onBeforeMount( async () => {
  // Build storage L1 select options
  storageL1List.value = await StoragesService.getStorages()
  for ( let storageL1 of storageL1List.value ) { storageL1SelectOptions.value.push( { label: storageL1.idno, value: storageL1.id } ) }
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


function renderLabel ( option: SelectOption | SelectGroupOption, selected: boolean ): VNodeChild {
  return h(
    'div', // HTML tag
    null, // Tag's attributes
    [
      h( NText, { style: 'padding-end: 1em;' }, { default: () => { return option.label } } ),
      h( NText, { depth: 3 }, {
        default: () => {
          const matchedL1Storage = storageL1List.value.find( element => element.id == option.value )
          return matchedL1Storage?.name
        },
      } ),
    ]
  )
}


async function createRack ( newRackData: SeastoneSmartRackCreate ) {
  try {
    const response = await SeastoneService.createSeastoneSmartRack( { requestBody: newRackData } )
    message.success( `${ response.rack_idno } 建立成功` )
    router.push( '/wms/seastone_racks' )
  } catch ( error ) {
    if ( error instanceof ApiError && error.status === 409 ) { message.error( '料架重複，無法建立' ) }
    else { throw error; }
  }
}

async function onClickCreateRackButton ( event: Event ) {
  formRef.value?.validate( async ( errors ) => {
    if ( !errors ) { await createRack( formValue.value ) }
    else { message.error( '請輸入必填欄位' ) }
  } )
}
</script>



<template>
  <main>
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
      <n-breadcrumb-item>建立料架</n-breadcrumb-item>
    </n-breadcrumb>

    <div style="padding: 1rem;">
      <n-h1 prefix="bar" style="font-size: 1.4rem;">建立料架</n-h1>
      <n-space vertical size="large"
        style="background-color: white; padding: 1rem; box-shadow: 0px 4px 20px -4px hsla(0, 0%, 60%, 0.4)">

        <n-form size="large" :model=" formValue " :rules=" rules " ref="formRef">
          <n-grid cols="1 s:2" responsive="screen" x-gap="20">

            <n-form-item-gi show-require-mark label="所在倉位">
              <n-select v-model:value.lazy=" formValue.l1_storage_id " :options=" storageL1SelectOptions " filterable
                :render-label=" renderLabel "></n-select>
            </n-form-item-gi>

            <n-form-item-gi show-require-mark label="服務主機位址" path="server_address">
              <n-input v-model:value.lazy=" formValue.server_address "
                :input-props=" { id: 'server_address' } "></n-input>
            </n-form-item-gi>

            <n-form-item-gi show-require-mark label="料架代碼" path="rack_idno">
              <n-input v-model:value.lazy=" formValue.rack_idno " :input-props=" { id: 'rack_idno' } "></n-input>
            </n-form-item-gi>

            <n-form-item-gi label="Wi-Fi IP 位址" path="wifi_ip">
              <n-input v-model:value.lazy=" formValue.wifi_ip " :input-props=" { id: 'wifi_ip' } "></n-input>
            </n-form-item-gi>

            <n-form-item-gi show-require-mark label="Wi-Fi MAC 位址" path="wifi_mac">
              <n-input v-model:value.lazy=" formValue.wifi_mac " :input-props=" { id: 'wifi_mac' } "></n-input>
            </n-form-item-gi>

            <n-form-item-gi label="有線 IP 位址" path="eth_ip">
              <n-input v-model:value.lazy=" formValue.eth_ip " :input-props=" { id: 'eth_ip' } "></n-input>
            </n-form-item-gi>

            <n-form-item-gi show-require-mark label="有線 MAC 位址" path="eth_mac">
              <n-input v-model:value.lazy=" formValue.eth_mac " :input-props=" { id: 'eth_mac' } "></n-input>
            </n-form-item-gi>

            <n-form-item-gi show-require-mark label="料架序號" path="dev_id">
              <n-input v-model:value.lazy=" formValue.dev_id " :input-props=" { id: 'dev_id' } "></n-input>
            </n-form-item-gi>


            <n-form-item-gi span="2">
              <n-button type="primary" block @click=" onClickCreateRackButton( $event ) " attr-type="submit">送出
              </n-button>
            </n-form-item-gi>

          </n-grid>

        </n-form>

      </n-space>
    </div>
  </main>
</template>



<style scoped>
main {
  min-height: calc(100vh - 60px);
  background-color: hsla(0, 0%, 92%, 1.0);
  background-image: url('/pattern.svg');
  background-repeat: repeat-x;
  background-position: center;
  background-size: cover;
}
</style>
