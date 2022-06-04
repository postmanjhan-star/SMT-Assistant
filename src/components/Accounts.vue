<script setup>
import { reactive, onBeforeMount } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { NSpace } from 'naive-ui';
import { NBreadcrumb, NBreadcrumbItem } from 'naive-ui';
import { NDataTable, NButton, NH1 } from 'naive-ui';
import { NA } from 'naive-ui';
import { AccountsService } from '../client';
import { OpenAPI } from '../opanApi';

const router = useRouter();

const columns = [
  {
    title: '帳號',
    key: 'username',
  },
]

const data = reactive( [] );

onBeforeMount( async () => {
  let AccountsData = await AccountsService.getRecentAccounts();
  for ( let row of AccountsData ) {
    data.push( row );
  }
  // console.debug( data );
} );

function handleCreateAccountButtonClick () {
  router.push( '/accounts/create' );
}
</script>


<template>
  <main
    style="min-height: calc(100vh - 60px); background-color: hsla(0, 0%, 92%, 1.0); background-image: url('/pattern.svg'); background-repeat: repeat-x; background-position: center; background-size: cover;">
    <n-breadcrumb
      style="padding: 1rem; box-shadow: 0px 4px 20px -4px hsla(0, 0%, 60%, 0.4); position: relative; background-color: white; z-index: 1;">
      <n-breadcrumb-item>
        <router-link to="/home" #=" { navigate, href } " custom>
          <n-a :href=" href " @click=" navigate ">首頁</n-a>
        </router-link>
      </n-breadcrumb-item>
      <n-breadcrumb-item>系統管理</n-breadcrumb-item>
      <n-breadcrumb-item>帳號管理</n-breadcrumb-item>
    </n-breadcrumb>

    <div style="padding: 1rem;">
      <n-h1 prefix="bar" style="font-size: 1.4rem;">帳號管理</n-h1>
      <n-space vertical size="large"
        style="background-color: white; padding: 1rem; box-shadow: 0px 4px 20px -4px hsla(0, 0%, 60%, 0.4)">
        <n-button type="primary" @click=" handleCreateAccountButtonClick ">建立新帳號</n-button>
        <n-data-table :columns=" columns " :data=" data " striped :single-line=" false "></n-data-table>
      </n-space>
    </div>
  </main>
</template>


<style scoped>
</style>
