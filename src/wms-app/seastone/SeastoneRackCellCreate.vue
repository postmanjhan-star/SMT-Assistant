<script setup lang="ts">
import { range } from 'lodash'
import { FormInst, FormItemRule, FormRules, NA, NBreadcrumb, NBreadcrumbItem, NButton, NForm, NFormItemGi, NGrid, NH1, NInputNumber, NRadioButton, NRadioGroup, NSpace, useMessage } from 'naive-ui'
import { ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ApiError, OpenAPI, SeastoneService, SeastoneSmartRackCellCreateWithoutRackId } from '../../client/index'
import { useAuthStore } from '../../stores/auth'


const route = useRoute()
const router = useRouter()
const message = useMessage()
const authStore = useAuthStore()
OpenAPI.TOKEN = JSON.parse( authStore.accountToken )[ 'access_token' ]
const formValue = ref
  <{ side: number | null, startCellNumber: number, endCellNumber: number }>
  ( { side: null, startCellNumber: 0, endCellNumber: 0 } )
const formRef = ref<FormInst | null>( null )

const sideOptions = [
  { label: '正面', value: 0 },
  { label: '背面', value: 1 },
]


const rules: FormRules = {
  side: {
    required: true, message: '請選擇面向', trigger: [ 'change' ],
    validator: ( rule: FormItemRule, value: number ) => { return ( value != undefined ? true : false ) },
  },
  startCellNumber: { type: 'integer', required: true, message: '請输入起號', trigger: [ 'input', 'blur' ] },
  endCellNumber: { type: 'integer', required: true, message: '請输入末號', trigger: [ 'input', 'blur' ] },
}



async function onClickCreateCellButton ( event: Event ) {
  try { await formRef.value?.validate( async ( error ) => { if ( error ) { throw error } } ) }
  catch ( error ) {
    message.error( '請輸入必填爛位' )
    return false
  }

  // End number must be greater than start number
  if ( formValue.value.endCellNumber < formValue.value.startCellNumber ) {
    message.error( '末號要大於起號' )
    return false
  }

  // Build array of cells data for requesting to create cells
  let cellCreateArray: SeastoneSmartRackCellCreateWithoutRackId[] = []
  const r = range( formValue.value.startCellNumber, formValue.value.endCellNumber + 1 )
  for ( let cellNumber of r ) {
    const cellIdno = route.params.rack_idno.toString() + cellNumber.toString().padStart( 4, '0' ) // rack_idno is A001, cell_number is 0001, cell_idno would be A0010001.
    cellCreateArray.push( { side: formValue.value.side, cell_idno: cellIdno } )
  }

  // Check cell idno duplication from backend before sending request

  // Send request
  try {
    await SeastoneService.createCell( { rackIdno: route.params.rack_idno.toString(), requestBody: cellCreateArray } )
    message.success( `建立成功` )
    router.push( { path: `/wms/seastone_racks/${ route.params.rack_idno.toString() }`, query: { tab: 'cells' } } )
  } catch ( error ) {
    if ( error instanceof ApiError && error.status === 409 ) {
      message.error( '有重複料槽，建立失敗' )
      return false
    } else if ( error ) {
      message.error( '建立失敗' )
      return false
    }
  }
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
      <n-breadcrumb-item>
        <router-link :to=" `/wms/seastone_racks/${ route.params.rack_idno.toString() }` " #=" { navigate, href } "
          custom>
          <n-a :href=" href " @click=" navigate ">{{ route.params.rack_idno.toString() }}</n-a>
        </router-link>
      </n-breadcrumb-item>
      <n-breadcrumb-item>建立槽位</n-breadcrumb-item>
    </n-breadcrumb>

    <div style="padding: 1rem;">
      <n-h1 prefix="bar" style="font-size: 1.4rem;">建立槽位</n-h1>
      <n-space vertical size="large"
        style="background-color: white; padding: 1rem; box-shadow: 0px 4px 20px -4px hsla(0, 0%, 60%, 0.4)">

        <n-form size="large" :model=" formValue " :rules=" rules " ref="formRef">
          <n-grid cols="1" responsive="screen" x-gap="20">

            <n-form-item-gi show-require-mark label="面向" path="side">
              <n-radio-group v-model:value.lazy=" formValue.side " style="min-width: 40%;" id="side-radio-group">
                <n-radio-button v-for="   side    in sideOptions" :key=" side.label " :value=" side.value "
                  style="width: 50%; text-align: center;">{{ side.label }}</n-radio-button>
              </n-radio-group>
            </n-form-item-gi>

            <n-form-item-gi show-require-mark label="槽位起號" path="startCellNumber">
              <n-input-number v-model:value.lazy=" formValue.startCellNumber " :show-button=" false " :min=" 0 "
                :default-value=" 0 " style="width: 100%;" :input-props=" { id: 'startCellNumber' } "></n-input-number>
            </n-form-item-gi>

            <n-form-item-gi show-require-mark label="槽位末號" path="endCellNumber">
              <n-input-number v-model:value.lazy=" formValue.endCellNumber " :show-button=" false " style="width: 100%;"
                :default-value=" 0 " :min=" 0 " :input-props=" { id: 'endCellNumber' } "></n-input-number>
            </n-form-item-gi>

            <n-form-item-gi span="2">
              <n-button type="primary" block @click=" onClickCreateCellButton( $event ) "
                attr-type="submit">送出</n-button>
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
