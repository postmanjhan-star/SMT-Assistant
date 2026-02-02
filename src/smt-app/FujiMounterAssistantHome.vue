<script setup lang="ts">
import { FormInst, FormItemRule, FormRules, InputInst, NA, NButton, NForm, NFormItemGi, NGi, NGrid, NH1, NInput, NRadioButton, NRadioGroup, NSpace, useMessage, NSwitch, NSelect } from 'naive-ui'
import { ref, watch, nextTick } from 'vue'
import { useMeta } from 'vue-meta'
import { RouterLink, useRouter, useRoute } from 'vue-router'
import { ApiError, SmtService, StErpService } from '../client'

const route = useRoute()
const router = useRouter()
const message = useMessage()
useMeta( { title: 'Fuji Mounter Assistant' } )

const isTestingMode = ref(route.query.testing_mode === '1')

const testingDefaults = {
  workOrderIdno: 'ZZ9999',
  productIdno: '40Y85-009B-T1',
  mounterIdno: 'XP2B1',
  workSheetSide: 'TOP'
}

async function onToggleTestingMode(val: Boolean) {
  const newQuery = { ...route.query }

  if (val) {
    newQuery.testing_mode = '1'
    newQuery.testing_product_idno = formValue.value.productIdno?.trim() || testingDefaults.productIdno
  } else {
    delete newQuery.testing_mode
    delete newQuery.testing_product_idno
  }

  await router.replace({
    query: newQuery,
  })

  message.info(val ? '🧪 試產生產模式已開啟' : '✅ 正式生產模式已開啟')
}

const formRef = ref<FormInst | null>( null )
const formValue = ref<
  { workOrderIdno: string, mounterIdno: string, productIdno: string, workSheetSide: "TOP" | "BOTTOM" | "DUPLEX" }
>(
  { workOrderIdno: '', mounterIdno: '', productIdno: '', workSheetSide: null }
)

const workOrderIdnoInput = ref<InputInst>()

const workSheetSideOptions = [ { label: 'TOP面', value: 'TOP' }, { label: 'BOT面', value: 'BOTTOM' }, { label: 'B+T面', value: 'DUPLEX' } ]

const mounterOptions = ref<{ label: string, value: string }[]>([])

watch(
  () => route.query.testing_mode,
  async (newVal) => {
    if (newVal === '1') {
      Object.assign(formValue.value, testingDefaults)

      await nextTick()
      const input = document.querySelector('#productIdnoInput') as HTMLInputElement
      if (input) {
        setTimeout(() => {
          input.focus()
          input.select()
        }, 100)
      }
    } else {
      Object.keys(formValue.value).forEach(key => formValue.value[key] = '')
    }
  },
  { 'immediate': true }
)

watch(
  () => formValue.value.productIdno,
  async (newVal) => {
    if (route.query.testing_mode === '1') {
      const newQuery = { ...route.query }
      if (newVal && newVal.trim()) {
        newQuery.testing_product_idno = newVal.trim()
      } else {
        delete newQuery.testing_product_idno
      }
      await router.replace({ query: newQuery })
    }

    if (newVal && newVal.trim()) {
      try {
        const mounterIdnos = await SmtService.findFujiMounterIdnosByProductIdno({ productIdno: newVal.trim() })
        mounterOptions.value = mounterIdnos.map((id: string) => ({ label: id, value: id }))
        if (mounterOptions.value.length > 0) {
          if (!mounterOptions.value.some(opt => opt.value === formValue.value.mounterIdno)) {
            formValue.value.mounterIdno = mounterOptions.value[0].value
          }
        }
      } catch (e) { console.error(e) }
    }
  }
)

watch(
  () => formValue.value.workOrderIdno,
  async (newVal) => {
    if (isTestingMode.value || !newVal) return
    try {
      const stWorkOrder = await StErpService.getStWorkOrder({ workOrderIdno: newVal.trim() })
      if (stWorkOrder && stWorkOrder.product_idno) {
        formValue.value.productIdno = stWorkOrder.product_idno
        message.success(`已自動帶入成品料號：${stWorkOrder.product_idno}`)
      }
    } catch (error) {
      console.error(error)
    }
  }
)

const rules: FormRules = {
  workOrderIdno: { required: true, message: '請輸入工單號', trigger: [ 'blur' ], },
  productIdno: { required: true, message: '請輸入成品料號', trigger: [ 'blur', 'input' ] },
  mounterIdno: { required: true, message: '請輸入線別', trigger: [ 'input', 'blur' ], },
  workSheetSide: {
    required: true, message: '請選擇工件正反面', trigger: [ 'change' ],
    validator: ( rule: FormItemRule, value: string ) => { return ( value != undefined ? true : false ) },
  },
}

async function onClickSubmitButton ( event: Event ) {
  try { await formRef.value?.validate( async ( error ) => { if ( error ) { throw error } } ) }
  catch ( error ) {
    message.error( '請輸入必填爛位' )
    return false
  }

  try {
    const mounterData = await SmtService.getFujiMounterMaterialSlotPairs( {
      workOrderIdno: formValue.value.workOrderIdno.trim(),
      boardSide: formValue.value.workSheetSide,
      productIdno: formValue.value.productIdno.trim(),
      mounterIdno: formValue.value.mounterIdno.trim(),
      testingMode: route.query.testing_mode === '1' ? true : false,
      testingProductIdno: route.query.testing_product_idno ? route.query.testing_product_idno.toString() : null,
    } )
    router.push( {
      path: `/smt/fuji-mounter/${ formValue.value.mounterIdno.trim() }/${ formValue.value.workOrderIdno.trim() }`,
      query: {
        product_idno: formValue.value.productIdno.trim(),
        work_sheet_side: formValue.value.workSheetSide.trim(),
        testing_mode: route.query.testing_mode === '1' ? '1' : null,
        testing_product_idno: route.query.testing_product_idno ? route.query.testing_product_idno.toString() : null,
      },
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
    <n-h1 style="text-align: center;">Fuji<br>打件機上料助手</n-h1>
    <n-space vertical size="large" style="padding: 1rem;">
      <n-form size="large" :model=" formValue " :rules=" rules " ref="formRef">
        <n-grid cols="1 s:3" responsive="screen">

          <n-gi></n-gi>
          <n-form-item-gi label="模式切換 (試產生產 / 正式生產)">
            <div class="flex items-center space-x-3 p-2">
              <n-switch v-model:value="isTestingMode" @update:value="onToggleTestingMode" />
              <span class="text-sm font-medium" :style="{ color: isTestingMode ? '#facc15' : '#4ade80' }">
                {{ isTestingMode ? '🧪 試產生產模式' : '✅ 正式生產模式' }}
              </span>
            </div>
          </n-form-item-gi>
          <n-gi></n-gi>

          <n-gi></n-gi>
          <n-form-item-gi label="工單號" show-require-mark path="workOrderIdno">
            <n-input autofocus v-model:value.lazy=" formValue.workOrderIdno " ref="workOrderIdnoInput"
              :input-props=" { id: 'workOrderIdnoInput' } " />
          </n-form-item-gi>
          <n-gi></n-gi>

          <n-gi></n-gi>
          <n-form-item-gi label="成品料號" show-require-mark path="productIdno">
            <n-input v-model:value.lazy=" formValue.productIdno " :input-props=" { id: 'productIdnoInput' } " />
          </n-form-item-gi>
          <n-gi></n-gi>

          <n-gi></n-gi>
          <n-form-item-gi label="線別" show-require-mark path="mounterIdno">
            <n-select size="large" v-model:value="formValue.mounterIdno" :options="mounterOptions"
              placeholder="請選擇線別" />
          </n-form-item-gi>
          <n-gi></n-gi>

          <n-gi></n-gi>
          <n-form-item-gi show-require-mark label="工件面向" path="workSheetSide">
            <n-radio-group v-model:value.lazy=" formValue.workSheetSide ">
              <n-radio-button v-for=" worksheetSide in workSheetSideOptions" :label=" worksheetSide.label "
                :key=" worksheetSide.label " :value=" worksheetSide.value "></n-radio-button>
            </n-radio-group>
          </n-form-item-gi>
          <n-gi></n-gi>

          <n-gi></n-gi>
          <n-form-item-gi>
            <n-button type="primary" block @click=" onClickSubmitButton( $event ) " attr-type="submit">
              確定</n-button>
          </n-form-item-gi>
          <n-gi></n-gi>

        </n-grid>
      </n-form>
    </n-space>
  </div>

  <!-- <div style="text-align: center; margin-top: 1rem;">
    <router-link to="/smt/fuji-mounter/upload_fst" #="{ navigate, href }" custom>
      <n-a :href="href" @click="navigate">上傳 FST 檔案作業</n-a>
    </router-link>
  </div> -->
</template>
