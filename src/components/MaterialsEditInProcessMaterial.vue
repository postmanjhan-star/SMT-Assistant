<script setup lang="ts">
import { FormInst, FormRules, NButton, NInput, NInputNumber, NSpace, useMessage } from 'naive-ui';
import { onBeforeMount, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ApiError, InProcessMaterialUpdate, MaterialsService, OpenAPI, UnitEnum } from '../client';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
OpenAPI.TOKEN = JSON.parse( authStore.accountToken )[ 'access_token' ];

const message = useMessage();
const router = useRouter();
const route = useRoute();

const formRef = ref<FormInst | null>( null );
const formValue = ref<InProcessMaterialUpdate>( {
  id: 0,
  idno: '',
  name: '',
  description: '',
  unit: 'PIECE' as UnitEnum,
  qty_per_pack: 1,
  expiry_days: 365,
} );



const unit_options = [
  { label: 'PIECE', value: 'PIECE' },
  { label: 'ROLL', value: 'ROLL' },
  { label: 'PLATE', value: 'PLATE' },
  { label: 'CM', value: 'CM' },
  { label: 'BOX', value: 'BOX' },
  { label: 'PACK', value: 'PACK' },
  { label: 'SHEET', value: 'SHEET' },
  { label: 'BAG', value: 'BAG' },
]



const rules: FormRules = {
  idno: { required: true, message: '請输入物料代碼', trigger: [ 'blur' ] },
  name: { required: true, message: '請输入物料名稱', trigger: [ 'input', 'blur' ] },
}



onBeforeMount( async () => {
  try { formValue.value = await MaterialsService.getMaterial( { idno: route.params.idno.toString() } ); }
  catch ( error ) { if ( error instanceof ApiError && error.status === 404 ) { router.push( '/404' ); } }
} );



async function onSubmitMaterialForm ( event: Event ) {
  // Check if any empyt fields
  try { await formRef.value?.validate( async ( error ) => { if ( error ) { throw error; } } ); }
  catch ( error ) {
    message.error( '請輸入必填爛位' );
    return false;
  }

  // Convert `idno` to uppercase
  formValue.value.idno = formValue.value.idno.toUpperCase();

  // Update Material
  try {
    const response = await MaterialsService.updateInProcessMaterial( { id: formValue.value.id, requestBody: formValue.value } );
    message.success( `更新成功` );
    router.push( '/materials' );
  } catch ( error ) {
    if ( error instanceof ApiError && error.status === 409 ) { message.error( '物料代碼已存在，請重新命名' ); }
    else { message.error( '更新失敗' ); }
  }
}
</script>



<template>

  <n-space vertical size="large"
    style="background-color: white; padding: 1rem; box-shadow: 0px 4px 20px -4px hsla(0, 0%, 60%, 0.4)">

    <n-form size="large" :model=" formValue " :rules=" rules " ref="formRef"
      @submit:prevent=" onSubmitMaterialForm( $event ) ">
      <n-grid cols="1 s:3" responsive="screen" x-gap="20">

        <n-form-item-gi show-require-mark label="物料代碼" path="idno" autofocus>
          <n-input v-model:value.lazy=" formValue.idno " autofocus
            :input-props=" { style: 'text-transform: uppercase;' } "></n-input>
        </n-form-item-gi>

        <n-form-item-gi show-require-mark label="物料名稱" path="name">
          <n-input v-model:value.lazy=" formValue.name "></n-input>
        </n-form-item-gi>

        <n-form-item-gi label="物料說明" path="description">
          <n-input v-model:value.lazy=" formValue.description "></n-input>
        </n-form-item-gi>

        <n-form-item-gi show-require-mark label="基本單位" path="unit">
          <n-select v-model:value.lazy=" formValue.unit " :options=" unit_options "></n-select>
        </n-form-item-gi>

        <n-form-item-gi show-require-mark label="基本包裝量">
          <n-input-number v-model:value.lazy=" formValue.qty_per_pack " :show-button=" false " :min=" 1 "
            style="width: 100%;" :precision=" 0 " :default-value=" 1 "></n-input-number>
        </n-form-item-gi>

        <n-form-item-gi show-require-mark label="有效期間">
          <n-input-number v-model:value.lazy=" formValue.expiry_days " :show-button=" false " :min=" 1 "
            style="width: 100%;" :precision=" 0 ">
            <template #suffix>日</template>
          </n-input-number>
        </n-form-item-gi>

        <n-form-item-gi span="3">
          <n-button type="primary" block @click=" onSubmitMaterialForm( $event ) " attr-type="submit">
            更新物料
          </n-button>
        </n-form-item-gi>

      </n-grid>
    </n-form>

  </n-space>

</template>



<style>

</style>
