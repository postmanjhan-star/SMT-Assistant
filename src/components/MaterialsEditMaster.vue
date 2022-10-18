<script setup lang="ts">
import { NTag } from 'naive-ui';
import { onBeforeMount, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ApiError, MaterialRead, MaterialsService, MaterialTypeEnum, MaterialUpdate, OpenAPI, UnitEnum } from '../client';
import { useAuthStore } from '../stores/auth';
import MaterialsEditRawMaterial from "./MaterialsEditRawMaterial.vue";
import MaterialsEditProduct from "./MaterialsEditProduct.vue";
import MaterialsEditInProcessMaterial from './MaterialsEditInProcessMaterial.vue';


const authStore = useAuthStore();
OpenAPI.TOKEN = JSON.parse( authStore.accountToken )[ 'access_token' ];

const router = useRouter();
const route = useRoute();

const material = ref<MaterialRead>({
  id: 0,
  idno: '',
  name: '',
  description: '',
  unit: UnitEnum.PIECE,
  qty_per_pack: 1,
  expiry_days: 365,
  material_type: MaterialTypeEnum.RAW_MATERIAL
});

const formValue = ref<MaterialUpdate>( {
  id: 0,
  idno: '',
  name: '',
  description: '',
  unit: UnitEnum.PIECE,
  qty_per_pack: 1,
  expiry_days: 365,
} );



onBeforeMount( async () => {
  try {
    material.value = await MaterialsService.getMaterial( { idno: route.params.idno.toString() } );
    formValue.value = {
      id: material.value.id,
      idno: material.value.idno,
      name: material.value.name,
      description: material.value.description,
      unit: material.value.unit,
      qty_per_pack: material.value.qty_per_pack,
      expiry_days: material.value.expiry_days,
    };
  } catch ( error ) { if ( error instanceof ApiError && error.status === 404 ) { router.push( '/404' ); } }
} );
</script>



<template>
  <main
    style="min-height: calc(100vh - 60px); background-color: hsla(0, 0%, 92%, 1.0); background-repeat: repeat-x; background-position: center; background-size: cover;">
    <n-breadcrumb
      style="padding: 1rem; box-shadow: 0px 4px 20px -4px hsla(0, 0%, 60%, 0.4); position: relative; background-color: white; z-index: 1; overflow: auto;">
      <n-breadcrumb-item>
        <router-link to="/home" #=" { navigate, href } " custom>
          <n-a :href=" href " @click=" navigate ">首頁</n-a>
        </router-link>
      </n-breadcrumb-item>
      <n-breadcrumb-item>基本資料管理</n-breadcrumb-item>
      <n-breadcrumb-item>
        <router-link to="/materials" #=" { navigate, href } " custom>
          <n-a :href=" href " @click=" navigate ">物料管理</n-a>
        </router-link>
      </n-breadcrumb-item>
      <n-breadcrumb-item>
        <router-link :to=" `/materials/${ $route.params.idno.toString().toUpperCase() }`" #=" { navigate, href } "
          custom>
          <n-a :href=" href " @click=" navigate ">{{ $route.params.idno.toString().toUpperCase() }}</n-a>
        </router-link>
      </n-breadcrumb-item>
    </n-breadcrumb>

    <div style="padding: 1rem;">
      <n-h1 prefix="bar" style="font-size: 1.4rem;">
        {{ $route.params.idno.toString().toUpperCase() }}
        <n-tag size="large" type="info" strong v-if=" material.material_type === MaterialTypeEnum.RAW_MATERIAL ">❹ 原料
        </n-tag>
        <n-tag size="large" type="info" strong v-if=" material.material_type === MaterialTypeEnum.PRODUCT ">❶ 成品
        </n-tag>
        <n-tag size="large" type="info" strong v-if=" material.material_type === MaterialTypeEnum.IN_PROCESS_MATERIAL ">❷ 半成品
        </n-tag>
      </n-h1>

      <materials-edit-raw-material v-if="material.material_type == MaterialTypeEnum.RAW_MATERIAL">
      </materials-edit-raw-material>

      <materials-edit-product v-if="material.material_type == MaterialTypeEnum.PRODUCT">
      </materials-edit-product>

      <materials-edit-in-process-material v-if="material.material_type == MaterialTypeEnum.IN_PROCESS_MATERIAL"></materials-edit-in-process-material>

    </div>
  </main>
</template>



<style>
main {
  background-image: url('/pattern.svg');
}
</style>
