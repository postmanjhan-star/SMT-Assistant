<script setup lang="ts">
import { FormInst, FormRules, InputInst, NA, NButton, NForm, NFormItemGi, NGi, NGrid, NH1, NInput, NInputGroup, NSelect, NSpace, useMessage, SelectOption, NButtonGroup, NRadioGroup, NRadioButton, RadioButtonProps } from 'naive-ui';
import { ref } from 'vue';
import { useMeta } from 'vue-meta';
import { RouterLink, useRouter } from 'vue-router';
import { ApiError, SmtService } from '../client';

const router = useRouter();
const message = useMessage();
useMeta( { title: 'Panasonic Mounter Assistant' } );

const formRef = ref<FormInst | null>( null );
const formValue = ref( { workOrderIdno: '', mounterIdno: '', workSheetSide: '', machineSide: '' } );
const workOrderIdnoInput = ref<InputInst>();
const rules: FormRules = {
  workOrderIdno: { required: true, message: '請輸入工單號', trigger: [ 'blur' ], },
  mounterIdno: { required: true, message: '請輸入機台號', trigger: [ 'input', 'blur' ], },
};

const workSheetSideOptions = [ { label: '工件正面', value: 'TOP' }, { label: '工件反面', value: 'BOTTOM' }, { label: '工件正反面', value: 'DUPLEX' } ]
const machineSideOptions = [ { label: '機台前面', value: '1' }, { label: '機台背面', value: '2' } ]


async function onClickSubmitButton ( event: Event ) {
  try { await formRef.value?.validate( async ( error ) => { if ( error ) { throw error; } } ); }
  catch ( error ) {
    message.error( '請輸入必填爛位' );
    return false;
  }

  if ( !!formValue.value.workSheetSide.trim() === false ) {
    message.error( '請輸入工件正反面' );
    return false;
  }

  if ( !!formValue.value.machineSide.trim() === false ) {
    message.error( '請輸入機台正反面' );
    return false;
  }

  try {
    const mounterDataArray = await SmtService.getPanasonicMounterMaterialSlotPairs( {
      workOrderIdno: formValue.value.workOrderIdno.trim(),
      mounterIdno: formValue.value.mounterIdno.trim(),
      boardSide: formValue.value.workSheetSide.trim(),
      machineSide: formValue.value.machineSide.trim(),
    } );
    router.push( {
      path: `/smt/panasonic-mounter/${ formValue.value.mounterIdno.trim() }/${ formValue.value.workOrderIdno.trim() }`,
      query: {
        workSheetSide: formValue.value.workSheetSide.trim(),
        machineSide: formValue.value.machineSide.trim(),
      }
    } );
  }
  catch ( error ) {
    if ( error instanceof ApiError && error.status === 404 ) {
      message.error( '查無資料' );
      return false;
    }
    if ( error instanceof ApiError && error.status === 503 ) {
      message.error( 'ERP 工單查詢失敗' );
      return false;
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
              ref="workOrderIdnoInput" />
          </n-form-item-gi>
          <n-gi></n-gi>

          <n-gi></n-gi>
          <n-form-item-gi label="機台號" show-require-mark path="mounterIdno">
            <n-input type="text" size="large" v-model:value.lazy=" formValue.mounterIdno " />
          </n-form-item-gi>
          <n-gi></n-gi>

          <n-gi></n-gi>
          <n-form-item-gi show-require-mark label="工件面向">
            <n-radio-group v-model:value.lazy=" formValue.workSheetSide ">
              <n-radio-button v-for=" worksheetSide in workSheetSideOptions" :label=" worksheetSide.label "
                :key=" worksheetSide.label " :value=" worksheetSide.value "></n-radio-button>
            </n-radio-group>
          </n-form-item-gi>
          <n-gi></n-gi>

          <n-gi></n-gi>
          <n-form-item-gi show-require-mark label="機台面向">
            <n-radio-group v-model:value.lazy=" formValue.machineSide ">
              <n-radio-button v-for=" machineSide in machineSideOptions" :label=" machineSide.label "
                :key=" machineSide.label" :value=" machineSide.value "></n-radio-button>
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
