<script setup lang="ts">
import { NButton, NInput, NSpace, NTabPane, NTabs, NTag } from 'naive-ui'
import { computed, onBeforeMount, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ApiError, MaterialRead, MaterialsService, MaterialTypeEnum, OpenAPI, UnitEnum } from '../../client'
import { useAuthStore } from '../../stores/auth'
import MaterialItemInventory from "./MaterialItemInventory.vue"
import MaterialItemStock from "./MaterialItemStock.vue"

const authStore = useAuthStore();
OpenAPI.TOKEN = JSON.parse( authStore.accountToken )[ 'access_token' ];

const router = useRouter();
const route = useRoute();

const material = ref<MaterialRead>( {
  id: 0,
  idno: '',
  material_type: MaterialTypeEnum.RAW_MATERIAL,
  name: '',
  description: '',
  unit: UnitEnum.PIECE,
  qty_per_pack: 1,
  expiry_days: 365,
} );

const formValue = computed( () => {
  return {
    id: material.value.id,
    idno: material.value.idno,
    materialType: material.value.material_type,
    name: material.value.name,
    description: material.value.description,
    unit: material.value.unit,
    qtyPerPack: material.value.qty_per_pack.toLocaleString(),
    expiryDays: material.value.expiry_days.toLocaleString(),
  }
} )


onBeforeMount( async () => {
  try { material.value = await MaterialsService.getMaterial( { idno: route.params.idno.toString() } ) }
  catch ( error ) { if ( error instanceof ApiError && error.status === 404 ) { router.push( '/http-status/404' ) } }
} );


function onClickEditButton ( event: Event ) { router.push( `/wms/materials/${ route.params.idno.toString() }/edit` ); }
</script>



<template>
  <main
    style="min-height: calc(100vh - 60px); background-color: hsla(0, 0%, 92%, 1.0); background-repeat: repeat-x; background-position: center; background-size: cover;">
    <n-breadcrumb
      style="padding: 1rem; box-shadow: 0px 4px 20px -4px hsla(0, 0%, 60%, 0.4); position: relative; background-color: white; z-index: 1; overflow: auto;">
      <n-breadcrumb-item>
        <router-link to="/wms/home" #=" { navigate, href } " custom>
          <n-a :href=" href " @click=" navigate ">首頁</n-a>
        </router-link>
      </n-breadcrumb-item>
      <n-breadcrumb-item>基本資料管理</n-breadcrumb-item>
      <n-breadcrumb-item>
        <router-link to="/wms/materials" #=" { navigate, href } " custom>
          <n-a :href=" href " @click=" navigate ">物料管理</n-a>
        </router-link>
      </n-breadcrumb-item>
      <n-breadcrumb-item>{{ $route.params.idno.toString().toUpperCase() }}</n-breadcrumb-item>
    </n-breadcrumb>

    <div style="padding: 1rem;">
      <n-h1 prefix="bar" style="font-size: 1.4rem;">
        {{ $route.params.idno.toString().toUpperCase() }}
        <n-tag size="large" type="info" strong v-if=" material.material_type === MaterialTypeEnum.RAW_MATERIAL ">❹ 原料
        </n-tag>
        <n-tag size="large" type="info" strong v-if=" material.material_type === MaterialTypeEnum.PRODUCT ">❶ 成品
        </n-tag>
        <n-tag size="large" type="info" strong v-if=" material.material_type === MaterialTypeEnum.IN_PROCESS_MATERIAL ">
          ❷ 半成品
        </n-tag>
      </n-h1>

      <n-space vertical size="large"
        style="background-color: white; padding: 1rem; box-shadow: 0px 4px 20px -4px hsla(0, 0%, 60%, 0.4)">

        <n-tabs type="line" size="large">

          <n-tab-pane name="properties" tab="基本屬性">

            <n-space size="large" style="margin-bottom: 1rem;">
              <n-button @click=" onClickEditButton( $event ) " attr-type="button">編輯</n-button>
            </n-space>

            <n-form size="large" :model=" formValue ">
              <n-grid cols="1 s:3" responsive="screen" x-gap="20">

                <n-form-item-gi label="物料代碼">
                  <n-input v-model:value.lazy=" formValue.idno " readonly :input-props=" { id: 'idno' } "></n-input>
                </n-form-item-gi>

                <n-form-item-gi label="物料名稱">
                  <n-input v-model:value.lazy=" formValue.name " readonly :input-props=" { id: 'name' } "></n-input>
                </n-form-item-gi>

                <n-form-item-gi label="物料說明">
                  <n-input v-model:value.lazy=" formValue.description " readonly
                    :input-props=" { id: 'description' } "></n-input>
                </n-form-item-gi>

                <n-form-item-gi label="基本單位">
                  <n-input v-model:value.lazy=" formValue.unit " readonly :input-props=" { id: 'unit' } "></n-input>
                </n-form-item-gi>

                <n-form-item-gi label="基本包裝量">
                  <n-input v-model:value.lazy=" formValue.qtyPerPack " :input-props=" { id: 'qtyPerPack' } "
                    readonly></n-input>
                </n-form-item-gi>

                <n-form-item-gi label="有效期間">
                  <n-input v-model:value.lazy=" formValue.expiryDays " :show-button=" false " readonly
                    :input-props=" { id: 'expiryDays' } ">
                    <template #suffix>日</template>
                  </n-input>
                </n-form-item-gi>

              </n-grid>
            </n-form>
          </n-tab-pane>

          <n-tab-pane name="inventories" tab="料況統計">
            <material-item-inventory></material-item-inventory>
          </n-tab-pane>

          <n-tab-pane name="stocks" tab="庫存明細">
            <material-item-stock></material-item-stock>
          </n-tab-pane>

        </n-tabs>

      </n-space>
    </div>
  </main>
</template>



<style>
main {
  background-image: url("/pattern.svg");
}
</style>
