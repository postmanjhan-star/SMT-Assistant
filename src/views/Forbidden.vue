<script setup>
import { useRouter } from 'vue-router';
import { NResult, NButton } from 'naive-ui';

const router = useRouter();

function handleButtonClick () {
  router.push( '/home' );
}
</script>

<template>
  <n-result status="403" title="403 禁止訪問" description="總有些門對你是關閉的" size="huge">
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
