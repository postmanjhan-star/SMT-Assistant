<script setup lang="ts">
import { FormInst, FormItemRule, FormRules, NA, NButton, NForm, NFormItemGi, NGi, NGrid, NH1, NInput, NRadioButton, NRadioGroup, NSpace, useMessage } from 'naive-ui'
import { ref } from 'vue'
import { useMeta } from 'vue-meta'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ApiError, SmtService } from '../client'

const route = useRoute()
const router = useRouter()
const message = useMessage()
useMeta( { title: 'Panasonic Mounter Assistant' } )

const formRef = ref<FormInst | null>( null )
const formValue = ref<{
  workOrderIdno: string,
  mounterIdno: string,
  workSheetSide: "TOP" | "BOTTOM" | "DUPLEX",
  machineSide: "1" | "2",
  productIdno: string,
}>(
  { workOrderIdno: '', mounterIdno: '', workSheetSide: null, machineSide: null, productIdno: '' }
)
const rules: FormRules = {
  workOrderIdno: { required: true, message: '請輸入工單號', trigger: [ 'blur' ] },
  productIdno: { required: true, message: '請輸入成品料號', trigger: [ 'blur', 'input' ] },
  mounterIdno: { required: true, message: '請輸入機台號', trigger: [ 'input', 'blur' ] },
  workSheetSide: {
    required: true, message: '請選擇工件正反面', trigger: [ 'change' ],
    validator: ( rule: FormItemRule, value: string ) => { return ( value != undefined ? true : false ) },
  },
  machineSide: {
    required: true, message: '請選擇工件正反面', trigger: [ 'change' ],
    validator: ( rule: FormItemRule, value: string ) => { return ( value != undefined ? true : false ) },
  },
}

const workSheetSideOptions = [ { label: '工件正面', value: 'TOP' }, { label: '工件反面', value: 'BOTTOM' }, { label: '工件正反面', value: 'DUPLEX' } ]
const machineSideOptions = [ { label: '機台前面', value: '1' }, { label: '機台背面', value: '2' } ]


async function onClickSubmitButton ( event: Event ) {
  try { await formRef.value?.validate( async ( error ) => { if ( error ) { throw error } } ) }
  catch ( error ) {
    message.error( '請輸入必填爛位' )
    return false
  }

  try {
    const mounterDataArray = await SmtService.getPanasonicMounterMaterialSlotPairs( {
      workOrderIdno: formValue.value.workOrderIdno.trim(), // ZZ9999
      productIdno: formValue.value.productIdno.trim(), // 40Y85-010A-M0
      mounterIdno: formValue.value.mounterIdno.trim(), // A1-NPM-W2
      boardSide: formValue.value.workSheetSide,
      machineSide: formValue.value.machineSide,

      // For testing and debugging. Example: http://127.0.0.1/smt/panasonic-mounter?testing_mode=1&testing_product_idno=40X76-002A-T3
      testingMode: route.query.testing_mode === '1' ? true : false,
      testingProductIdno: route.query.testing_product_idno ? route.query.testing_product_idno.toString() : null,
    } )
    router.push( {
      path: `/smt/panasonic-mounter/${ formValue.value.mounterIdno.trim() }/${ formValue.value.workOrderIdno.trim() }`,
      query: {
        work_sheet_side: formValue.value.workSheetSide.trim(),
        machine_side: formValue.value.machineSide.trim(),
        product_idno: formValue.value.productIdno.trim(),

        // For testing and debugging. Example: http://127.0.0.1/smt/panasonic-mounter/A1-NPM-W2/H0001?testing_mode=1&testing_product_idno=40X76-002A-T3
        testing_mode: route.query.testing_mode === '1' ? '1' : null,
        testing_product_idno: route.query.testing_product_idno ? route.query.testing_product_idno.toString() : null,
      }
    } )
  }
  catch ( error ) {
    if ( error instanceof ApiError && error.status === 404 ) {
      message.error( '查無資料' )
      return false
    }
    if ( error instanceof ApiError && error.status === 503 ) {
      message.error( 'ERP 工單查詢失敗' )
      return false
    }
  }
}
</script>



<template>
  <div style="padding: 1rem;">
    <n-h1 style="text-align: center;">Panasonic<br>打件機上料助手</n-h1>
    <n-space vertical size="large" style="padding: 1rem;">
      <n-form size="large" :model=" formValue " :rules=" rules " ref="formRef">
        <n-grid cols="1 s:3" responsive="screen">

          <n-gi></n-gi>
          <n-form-item-gi label="工單號" show-require-mark path="workOrderIdno">
            <n-input type="text" size="large" autofocus v-model:value.lazy=" formValue.workOrderIdno "
              :input-props=" { id: 'workOrderIdnoInput' } " />
          </n-form-item-gi>
          <n-gi></n-gi>

          <n-gi></n-gi>
          <n-form-item-gi label="成品料號" show-require-mark path="productIdno">
            <n-input type="text" size="large" autofocus v-model:value.lazy=" formValue.productIdno "
              :input-props=" { id: 'productIdnoInput' } " />
          </n-form-item-gi>
          <n-gi></n-gi>

          <n-gi></n-gi>
          <n-form-item-gi label="機台號" show-require-mark path="mounterIdno">
            <n-input type="text" size="large" v-model:value.lazy=" formValue.mounterIdno "
              :input-props=" { id: 'mounterIdnoInput' } " />
          </n-form-item-gi>
          <n-gi></n-gi>

          <n-gi></n-gi>
          <n-form-item-gi show-require-mark label="工件面向" path="workSheetSide">
            <n-radio-group v-model:value.lazy=" formValue.workSheetSide ">
              <n-radio-button v-for="worksheetSide in workSheetSideOptions" :label=" worksheetSide.label "
                :key=" worksheetSide.label " :value=" worksheetSide.value "></n-radio-button>
            </n-radio-group>
          </n-form-item-gi>
          <n-gi></n-gi>

          <n-gi></n-gi>
          <n-form-item-gi show-require-mark label="機台面向" path="machineSide">
            <n-radio-group v-model:value.lazy=" formValue.machineSide ">
              <n-radio-button v-for="machineSide in machineSideOptions" :label=" machineSide.label "
                :key=" machineSide.label " :value=" machineSide.value "></n-radio-button>
            </n-radio-group>
          </n-form-item-gi>
          <n-gi></n-gi>

          <n-gi></n-gi>
          <n-form-item-gi>
            <n-button type="primary" block size="large" @click=" onClickSubmitButton( $event ) " attr-type="submit">
              確定</n-button>
          </n-form-item-gi>
          <n-gi></n-gi>

        </n-grid>
      </n-form>

      <div style="text-align: center; margin-top: 1rem;">
        <router-link to="/smt/panasonic-mounter/upload_csv" #=" { navigate, href } " custom>
          <n-a :href=" href " @click=" navigate ">上傳 CSV 檔案作業</n-a>
        </router-link>
      </div>

    </n-space>
  </div>
</template>
