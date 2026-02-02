<script setup lang="ts">

import { FormInst, FormItemRule, FormRules, NA, NButton, NForm, NFormItemGi, NGi, NGrid, NIcon, NH1, NInput, NRadioButton, NRadioGroup, NSpace, useMessage, NSwitch, NSelect } from 'naive-ui'
import { ref, watch, nextTick } from 'vue'
import { useMeta } from 'vue-meta'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ApiError, SmtService, StErpService, STWorkOrder } from '@/client'
// import { FlaskConical, ShieldCheck } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const message = useMessage()
useMeta({ title: 'Panasonic Mounter Assistant' })

const isTestingMode = ref(route.query.testing_mode === '1')

const testingDefaults = {
  workOrderIdno: 'ZZ9999',
  productIdno: '40Y85-009B-9',
  mounterIdno: 'A1-NPM-W2',
  workSheetSide: 'DUPLEX',
  machineSide: '1+2'
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

const formRef = ref<FormInst | null>(null)
const formValue = ref<{
  workOrderIdno: string,
  mounterIdno: string,
  workSheetSide: "TOP" | "BOTTOM" | "DUPLEX",
  machineSide: "1" | "2" | "1+2",
  productIdno: string,
}>(
  { workOrderIdno: '', mounterIdno: '', workSheetSide: null, machineSide: null, productIdno: '' }
)
const rules: FormRules = {
  workOrderIdno: { required: true, message: '請輸入工單號', trigger: ['blur'] },
  productIdno: { required: true, message: '請輸入成品料號', trigger: ['blur', 'input'] },
  mounterIdno: { required: true, message: '請輸入線別', trigger: ['input', 'blur'] },
  workSheetSide: {
    required: true, message: '請選擇工件正反面', trigger: ['change'],
    validator: (rule: FormItemRule, value: string) => { return (value != undefined ? true : false) },
  },
  machineSide: {
    required: true, message: '請選擇工件正反面', trigger: ['change'],
    validator: (rule: FormItemRule, value: string) => { return (value != undefined ? true : false) },
  },
}

const workSheetSideOptions = [{ label: 'TOP面', value: 'TOP' }, { label: 'BOT面', value: 'BOTTOM' }, { label: 'B+T面', value: 'DUPLEX' }]
const machineSideOptions = [{ label: '機台前面', value: '1' }, { label: '機台背面', value: '2' }, { label: '機台正反面', value: '1+2' }]

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
        const mounterIdnos = await SmtService.findPanasonicMounterIdnosByProductIdno({ productIdno: newVal.trim() })
        mounterOptions.value = mounterIdnos.map(id => ({ label: id, value: id }))
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


async function onClickSubmitButton(event: Event) {
  try { await formRef.value?.validate(async (error) => { if (error) { throw error } }) }
  catch (error) {
    message.error('請輸入必填爛位')
    return false
  }



  try {
    const mounterDataArray = await SmtService.getPanasonicMounterMaterialSlotPairs({
      workOrderIdno: formValue.value.workOrderIdno.trim(), // ZZ9999
      productIdno: formValue.value.productIdno.trim(), // 40Y85-010A-M0
      mounterIdno: formValue.value.mounterIdno.trim(), // A1-NPM-W2
      boardSide: formValue.value.workSheetSide,
      machineSide: formValue.value.machineSide,

      // For testing and debugging. Example: http://127.0.0.1/smt/panasonic-mounter?testing_mode=1&testing_product_idno=40X76-002A-T3
      testingMode: route.query.testing_mode === '1' ? true : false,
      testingProductIdno: route.query.testing_product_idno ? route.query.testing_product_idno.toString() : null,
    })
    router.push({
      path: `/smt/panasonic-mounter/${formValue.value.mounterIdno.trim()}/${formValue.value.workOrderIdno.trim()}`,
      query: {
        work_sheet_side: formValue.value.workSheetSide.trim(),
        machine_side: formValue.value.machineSide.trim(),
        product_idno: formValue.value.productIdno.trim(),

        // For testing and debugging. Example: http://127.0.0.1/smt/panasonic-mounter/A1-NPM-W2/H0001?testing_mode=1&testing_product_idno=40X76-002A-T3
        testing_mode: route.query.testing_mode === '1' ? '1' : null,
        testing_product_idno: route.query.testing_product_idno ? route.query.testing_product_idno.toString() : null,
      }
    })
  }
  catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      message.error('查無資料')
      return false
    }
    if (error instanceof ApiError && error.status === 503) {
      message.error('ERP 工單查詢失敗')
      return false
    }
  }
}
</script>



<template>
  <div style="padding: 1rem;">
    <n-h1 style="text-align: center;">Panasonic<br>打件機上料助手</n-h1>
    <n-space vertical size="large" style="padding: 1rem;">
      <n-form size="large" :model="formValue" :rules="rules" ref="formRef">
        <n-grid cols="1 s:3" responsive="screen">
          <!-- 🧪 模式切換（合併開關與模式文字） -->
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
            <n-input type="text" size="large" autofocus v-model:value.lazy="formValue.workOrderIdno"
              :input-props="{ id: 'workOrderIdnoInput' }" />
          </n-form-item-gi>
          <n-gi></n-gi>

          <n-gi></n-gi>
          <n-form-item-gi label="成品料號" show-require-mark path="productIdno">
            <n-input type="text" size="large" autofocus v-model:value.lazy="formValue.productIdno"
              :input-props="{ id: 'productIdnoInput' }" />
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
            <n-radio-group v-model:value.lazy="formValue.workSheetSide">
              <n-radio-button v-for="worksheetSide in workSheetSideOptions" :label="worksheetSide.label"
                :key="worksheetSide.label" :value="worksheetSide.value"></n-radio-button>
            </n-radio-group>
          </n-form-item-gi>
          <n-gi></n-gi>

          <n-gi></n-gi>
          <n-form-item-gi show-require-mark label="機台面向" path="machineSide">
            <n-radio-group v-model:value.lazy="formValue.machineSide">
              <n-radio-button v-for="machineSide in machineSideOptions" :label="machineSide.label"
                :key="machineSide.label" :value="machineSide.value"></n-radio-button>
            </n-radio-group>
          </n-form-item-gi>
          <n-gi></n-gi>

          <n-gi></n-gi>
          <n-form-item-gi>
            <n-button type="primary" block size="large" @click=" onClickSubmitButton($event)" attr-type="submit">
              確定</n-button>
          </n-form-item-gi>
          <n-gi></n-gi>
        </n-grid>
      </n-form>
    </n-space>
  </div>
</template>
