<script setup lang="ts">
import { NA, NBreadcrumb, NBreadcrumbItem, NButton, NForm, NFormItemGi, NGrid, NH1, NInput, NSpace, NTabPane, NTabs } from 'naive-ui';
import { onBeforeMount, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { OpenAPI, StorageRead, StoragesService, StorageTypeEnum } from '../../client';
import { useAuthStore } from '../../stores/auth';
import StoragesL2StorageMain from './StoragesL2StorageMain.vue';
import StoragesMaterialBalance from './StoragesMaterialBalance.vue';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
OpenAPI.TOKEN = JSON.parse( authStore.accountToken )[ 'access_token' ];

const formValue = ref<StorageRead>( { id: 0, idno: '', name: '', type: StorageTypeEnum.INTERNAL_WAREHOUSE, l2_storages: [] } );

onBeforeMount( async () => { formValue.value = await StoragesService.getStorage( { l1Id: Number( route.params.id ) } ) } )

function onClickEditButton ( event: Event ) { router.push( `/wms/storages/${ route.params.id.toString() }/edit` ); }
</script>



<template>
  <main style="min-height: calc(100vh - 60px);">
    <n-breadcrumb
      style="padding: 1rem; box-shadow: 0px 4px 20px -4px hsla(0, 0%, 60%, 0.4); position: relative; background-color: white; z-index: 1; overflow: auto;">
      <n-breadcrumb-item>
        <router-link to="/wms/home" #=" { navigate, href } " custom>
          <n-a :href=" href " @click=" navigate ">首頁</n-a>
        </router-link>
      </n-breadcrumb-item>
      <n-breadcrumb-item>基本資料管理</n-breadcrumb-item>
      <n-breadcrumb-item>
        <router-link to="/wms/storages" #=" { navigate, href } " custom>
          <n-a :href=" href " @click=" navigate ">倉位管理</n-a>
        </router-link>
      </n-breadcrumb-item>
      <n-breadcrumb-item>{{ formValue.idno?.toUpperCase() }}</n-breadcrumb-item>
    </n-breadcrumb>

    <div style="padding: 1rem;">
      <n-h1 prefix="bar" style="font-size: 1.4rem;">倉位 {{ formValue.idno?.toUpperCase() }}</n-h1>
      <n-space vertical size="large"
        style="background-color: white; padding: 1rem; box-shadow: 0px 4px 20px -4px hsla(0, 0%, 60%, 0.4)">

        <n-tabs type="line" size="large">

          <n-tab-pane name="properties" tab="基本屬性">

            <n-space size="large" style="margin-bottom: 1rem;">
              <n-button @click=" onClickEditButton( $event ) " attr-type="button">編輯</n-button>
            </n-space>

            <n-form size="large" :model=" formValue ">
              <n-grid cols="1 s:2" responsive="screen" x-gap="20">

                <n-form-item-gi label="倉位代碼">
                  <n-input v-model:value.lazy=" formValue.idno " readonly
                    :input-props=" { style: 'text-transform: uppercase;' } ">
                  </n-input>
                </n-form-item-gi>

                <n-form-item-gi label="倉位名稱">
                  <n-input v-model:value.lazy=" formValue.name " readonly
                    :input-props=" { style: 'text-transform: uppercase;' } ">
                  </n-input>
                </n-form-item-gi>

              </n-grid>
            </n-form>
          </n-tab-pane>

          <n-tab-pane name="l2_storages" tab="儲位管理">
            <storages-l2-storage-main></storages-l2-storage-main>
          </n-tab-pane>

          <n-tab-pane name="materials" tab="物料一覽">
            <storages-material-balance></storages-material-balance>
          </n-tab-pane>
        </n-tabs>

      </n-space>
    </div>
  </main>
</template>



<style>
main {
  background-image: url('/pattern.svg');
  background-color: hsla(0, 0%, 92%, 1.0);
  background-repeat: repeat-x;
  background-position: center;
  background-size: cover;
}
</style>
