<script setup lang="ts">
import { FormInst, FormRules, InputInst, NA, NButton, NForm, NFormItemGi, NGi, NGrid, NH1, NInput, NSpace, useMessage } from 'naive-ui'
import { ref } from 'vue'
import { useMeta } from 'vue-meta'
import { RouterLink, useRouter } from 'vue-router'
import { ApiError, SmtService } from '../client'

const router = useRouter()
const message = useMessage()
useMeta( { title: 'Fuji Mounter Assistant' } )

const formRef = ref<FormInst | null>( null )
const formValue = ref( { workOrderIdno: '', mounterIdno: '' } )
const workOrderIdnoInput = ref<InputInst>()
const rules: FormRules = {
  workOrderIdno: { required: true, message: '請輸入工單號', trigger: [ 'blur' ], },
  mounterIdno: { required: true, message: '請輸入機台號', trigger: [ 'input', 'blur' ], }
}


async function onClickSubmitButton ( event: Event ) {
  try { await formRef.value?.validate( async ( error ) => { if ( error ) { throw error; } } ) }
  catch ( error ) {
    message.error( '請輸入必填爛位' )
    return false
  }

  try {
    const mounterData = await SmtService.getFujiMounterMaterialSlotPairs( {
      workOrderIdno: formValue.value.workOrderIdno.trim(),
      mounterIdno: formValue.value.mounterIdno.trim(),
    } )
    router.push( `/smt/fuji-mounter/${ formValue.value.mounterIdno.trim() }/${ formValue.value.workOrderIdno.trim() }` )
  }
  catch ( error ) {
    if ( error instanceof ApiError && error.status === 404 ) {
      message.error( '查無資料' )
      return false;
    }
    if ( error instanceof ApiError && error.status === 503 ) {
      message.error( 'ERP 工單查詢失敗' )
      return false;
    }
  }
}
</script>



<template>
  <div style="padding: 1rem;">
    <n-h1 style="text-align: center;">Fuji 打件機上料助手</n-h1>
    <n-space vertical size="large" style="padding: 1rem;">
      <n-form size="large" :model=" formValue " :rules=" rules " ref="formRef">
        <n-grid cols="1 s:3" responsive="screen">

          <n-gi></n-gi>
          <n-form-item-gi label="工單號" show-require-mark path="workOrderIdno">
            <n-input type="text" size="large" autofocus v-model:value.lazy=" formValue.workOrderIdno "
              ref="workOrderIdnoInput" :input-props=" { id: 'workOrderIdnoInput' } " />
          </n-form-item-gi>
          <n-gi></n-gi>

          <n-gi></n-gi>
          <n-form-item-gi label="機台號" show-require-mark path="mounterIdno">
            <n-input type="text" size="large" v-model:value.lazy=" formValue.mounterIdno "
              :input-props=" { id: 'mounterIdnoInput' } " />
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
        <router-link to="/smt/fuji-mounter/upload_fst" #=" { navigate, href } " custom>
          <n-a :href=" href " @click=" navigate ">上傳 FST 檔案作業</n-a>
        </router-link>
      </div>

    </n-space>
  </div>
</template>
