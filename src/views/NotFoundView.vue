<script setup>
import { useRouter, useRoute } from 'vue-router';
import { NResult, NButton } from 'naive-ui';

const router = useRouter();

function handleButtonClick () {
  router.push( '/home' );
}
</script>

<template>
  <n-result status="404" title="404 資源不存在" description="生活總歸帶點荒謬" size="huge">
    <template #footer>
      <n-button size="large" type="primary" @click=" handleButtonClick ">回首頁</n-button>
    </template>
  </n-result>
</template>

<style>
.n-result {
  margin-top: 4rem;
}
</style>
