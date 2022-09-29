<script setup lang="ts">
import { InputInst, NA, NButton, NForm, NFormItemGi, NGi, NGrid, NInput, NSpace, useMessage } from 'naive-ui';
import { onMounted, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { ApiError, StErpService } from '../client';

const router = useRouter();
const message = useMessage();

const formValue = ref( { workOrderIdno: '' } );
const workOrderIdnoInput = ref<InputInst>();

onMounted( async () => {
  // const workOrders = await StErpService.getStWorkOrders();
} );



async function onClickSubmitButton ( event: Event ) {
  if ( !!formValue.value.workOrderIdno.trim() === false ) {
    message.warning( '請輸入工單號' );
    return false;
  }

  try {
    const workOrder = await StErpService.getStWorkOrderForSmtMounterMatchCheck( { workOrderIdno: formValue.value.workOrderIdno.trim() } );
    console.debug( workOrder );
    router.push( `/smt/mounter/work_orders/${ formValue.value.workOrderIdno.trim() }` );
  }
  catch ( error ) {
    if ( error instanceof ApiError && error.status === 404 ) {
      message.error( '無此工單' );
      return false;
    }
  }
}
</script>



<template>
  <div style="padding: 1rem;">

    <n-space vertical size="large" style="padding: 1rem;">
      <n-form size="large" :model="formValue">
        <n-grid cols="1 s:3" responsive="screen">

          <n-gi></n-gi>
          <n-form-item-gi label="工單號">
            <n-input type="text" size="large" autofocus v-model:value.lazy="formValue.workOrderIdno"
              ref="workOrderIdnoInput" />
          </n-form-item-gi>
          <n-gi></n-gi>

          <n-gi></n-gi>
          <n-gi span="1">
            <n-button type="primary" block size="large" @click=" onClickSubmitButton( $event ) " attr-type="submit">
              確定</n-button>
          </n-gi>
          <n-gi></n-gi>

        </n-grid>
      </n-form>

      <div style="text-align: center; margin-top: 1rem;">
        <router-link to="/smt/mounter/upload_fst" #=" { navigate, href } " custom>
          <n-a :href=" href " @click=" navigate ">上傳 FST 檔案作業</n-a>
        </router-link>
      </div>

    </n-space>
  </div>
</template>
