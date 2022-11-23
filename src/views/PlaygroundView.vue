<script setup lang="ts">
import { darkTheme, dateZhTW, FormInst, GlobalThemeOverrides, InputInst, NButton, NConfigProvider, NForm, NFormItemGi, NGi, NGrid, NInput, NSpace, zhTW } from 'naive-ui';
import { h, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { ApiError } from '../client';


const darkThemeOverrides: GlobalThemeOverrides = {
  common: {
    fontWeightStrong: "600",
    inputColor: 'rgba(255, 255, 255, 0.1)'
  },
};



const activeKey = ref<string | null>( 'smt-home' );



const menuOptions = [
  { label: () => h( RouterLink, { to: '/wms/accounts' }, { default: () => 'Home' } ), key: 'smt-home' },
  { label: () => h( RouterLink, { to: '/wms/accounts' }, { default: () => 'Settings' } ), key: 'smt-settings' },
];



const formRef = ref<FormInst | null>( null )
const formValue = ref( { workOrderIdno: '' } );
const workOrderIdnoInput = ref<InputInst>();



onMounted( async () => {
  workOrderIdnoInput.value.focus();
  // const workOrders = await StErpService.getStWorkOrders();
} );



async function onClickSubmitButton ( event: Event ) {
  if ( !!formValue.value.workOrderIdno === false ) {
    return false;
  }

  try { }
  catch ( error ) {
    if ( error instanceof ApiError && error.status === 404 ) { }
    else { throw error; }
  }
}

// Take background colors from https://windicss.org/utilities/general/colors.html
</script>



<template>
  <n-config-provider :theme=" darkTheme " :theme-overrides=" darkThemeOverrides " :locale=" zhTW "
    :date-locale=" dateZhTW " inline-theme-disabled>
    <header style="position: sticky; top: 0; z-index: 2;">
      <n-layout-header style="padding: 9px;">
        <n-space item-style="" justify="space-between">
          <!-- Hide unused menu -->
          <!-- <n-menu v-model:value="activeKey" mode="horizontal" :options="menuOptions" /> -->
        </n-space>
      </n-layout-header>
    </header>

    <!-- Hide unused menu -->
    <!--<main style="min-height: calc(100vh - 60px); background-color: #27272A;">-->
    <main style="min-height: calc(100vh - 18px); background-color: #27272A;">

      <div style="padding: 1rem;">

        <n-space vertical size="large" style="padding: 1rem;">
          <n-form size="large" :model=" formValue " ref="formRef">
            <n-grid cols="1 s:3" responsive="screen">

              <n-gi></n-gi>
              <n-form-item-gi label="工單號">
                <n-input type="text" size="large" v-model:value.lazy=" formValue.workOrderIdno "
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
        </n-space>
      </div>
    </main>
  </n-config-provider>
</template>
    