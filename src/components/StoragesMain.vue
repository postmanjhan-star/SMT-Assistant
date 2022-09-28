<script setup lang="ts">
import { NA, NBreadcrumb, NBreadcrumbItem, NButton, NDataTable, NH1, NSpace } from 'naive-ui';
import { onBeforeMount, reactive } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { OpenAPI, StorageRead, StoragesService } from '../client';
import { useAuthStore } from '../stores/auth';

const router = useRouter();

const authStore = useAuthStore();
OpenAPI.TOKEN = JSON.parse( authStore.accountToken )[ 'access_token' ];

const data = reactive<StorageRead[]>( [] );

const columns = [
  { title: '倉位代碼', key: 'idno' },
  { title: '倉位名稱', key: 'name' },
]

const rowProps = ( row: StorageRead ) => {
  return {
    style: 'cursor: pointer;',
    onclick: () => { router.push( `/storages/${ row.id }` ); },
  }
};

onBeforeMount( async () => {
  let storagesData = await StoragesService.getStorages();
  for ( let row of storagesData ) { data.push( row ); }
} );

function handleCreateStoreageButtonClick () { router.push( '/storages/create' ); }
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
      <n-breadcrumb-item>基本資料管理</n-breadcrumb-item>
      <n-breadcrumb-item>倉位管理</n-breadcrumb-item>
    </n-breadcrumb>

    <div style="padding: 1rem;">
      <n-h1 prefix="bar" style="font-size: 1.4rem;">倉位管理</n-h1>
      <n-space vertical size="large"
        style="background-color: white; padding: 1rem; box-shadow: 0px 4px 20px -4px hsla(0, 0%, 60%, 0.4)">
        <n-button type="primary" @click=" handleCreateStoreageButtonClick ">建立倉位</n-button>
        <n-data-table :columns=" columns " :data=" data " striped :single-line=" false " :row-props=" rowProps ">
        </n-data-table>
      </n-space>
    </div>

  </main>
</template>
