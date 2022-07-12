<script setup lang="ts">
import { NA, NBreadcrumb, NBreadcrumbItem, NForm, NFormItemGi, NGrid, NH1, NInput, NSpace, useMessage } from 'naive-ui';
import { onBeforeMount, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { EpicorReceive, EpicorService, OpenAPI } from '../client';
import { useAuthStore } from '../stores/auth';
import EpicorReceivesSubItem from "./EpicorReceivesSubItem.vue";

const route = useRoute();
const router = useRouter();
const message = useMessage();

const authStore = useAuthStore();
OpenAPI.TOKEN = JSON.parse( authStore.accountToken )[ 'access_token' ];

const formValue = ref<EpicorReceive>( { SysRevID: 0, VendorNum: 0, ReceiptDate: '', PackSlip: '', PONum: '', VendorNumName: '' } );


onBeforeMount( async () => {
  formValue.value = await EpicorService.getEpicorReceive( parseInt( route.params.vendor_num.toString() ), route.params.pack_slip.toString() );
} );
</script>

<template>
  <main
    style="min-height: calc(100vh - 60px); background-color: hsla(0, 0%, 92%, 1.0); background-image: url('/pattern.svg'); background-repeat: repeat-x; background-position: center; background-size: cover;">
    <n-breadcrumb
      style="padding: 1rem; box-shadow: 0px 4px 20px -4px hsla(0, 0%, 60%, 0.4); position: relative; background-color: white; z-index: 1; overflow: auto;">
      <n-breadcrumb-item>
        <router-link to="/home" #=" { navigate, href } " custom>
          <n-a :href=" href " @click=" navigate ">首頁</n-a>
        </router-link>
      </n-breadcrumb-item>
      <n-breadcrumb-item>物料管理</n-breadcrumb-item>
      <n-breadcrumb-item>
        <router-link to="/epicor_receives" #=" { navigate, href } " custom>
          <n-a :href=" href " @click=" navigate ">Epicor 收料紀錄</n-a>
        </router-link>
      </n-breadcrumb-item>
      <n-breadcrumb-item>{{ $route.params.pack_slip.toString().toUpperCase() }}</n-breadcrumb-item>
    </n-breadcrumb>

    <div style="padding: 1rem;">
      <n-h1 prefix="bar" style="font-size: 1.4rem;">Epicor 收料包裝單 {{ $route.params.pack_slip.toString().toUpperCase() }}
      </n-h1>
      <n-space vertical size="large"
        style="background-color: white; padding: 1rem; box-shadow: 0px 4px 20px -4px hsla(0, 0%, 60%, 0.4)">
        <n-form size="large" :model=" formValue ">
          <n-grid cols="1 s:2" responsive="screen" x-gap="20">

            <n-form-item-gi show-require-mark label="收貨日期">
              <n-input v-model:value.lazy=" formValue.ReceiptDate " disabled>
              </n-input>
            </n-form-item-gi>

            <n-form-item-gi show-require-mark label="包裝單">
              <n-input v-model:value.lazy=" formValue.PackSlip "
                :input-props=" { style: 'text-transform: uppercase;' } " disabled>
              </n-input>
            </n-form-item-gi>

            <n-form-item-gi show-require-mark label="PO">
              <n-input v-model:value.lazy=" formValue.PONum " :input-props=" { style: 'text-transform: uppercase;' } "
                disabled>
              </n-input>
            </n-form-item-gi>

            <n-form-item-gi show-require-mark label="供應商名稱">
              <n-input v-model:value.lazy=" formValue.VendorNumName " disabled>
              </n-input>
            </n-form-item-gi>

          </n-grid>
        </n-form>
      </n-space>
    </div>
    <epicor-receives-sub-item></epicor-receives-sub-item>
  </main>
</template>
