<script setup>
import { NCard, NGi, NGrid, NMenu } from "naive-ui";
import backgroundImageUrl from '../assets/shapes-6393929_1920.jpg';
import { materialMenuOptions, purchaseMenuOptions, systemMenuOptions } from "../menuOptions";
import { useAccountStore } from "../stores/account";

const accountStore = useAccountStore();
</script>



<template>
  <main :style=" { backgroundImage: `url(${ backgroundImageUrl })` } "
    style="padding: 1rem; min-height: calc(100vh - 92px); background-repeat: no-repeat; background-attachment: fixed; background-size: cover; background-position: center; background-color: hsla(0, 0%, 84%, 1.0);">
    <n-grid cols="1 s:2 m:4 xl:5" responsive="screen" :x-gap=" 20 " :y-gap=" 20 ">

      <n-gi>
        <n-card class="main-card" title="基本資料管理" size="huge" :bordered=" false " header-style="padding-bottom: 0;">
          <n-menu :options=" purchaseMenuOptions " />
        </n-card>
      </n-gi>

      <n-gi>
        <n-card class="main-card" title="收發作業" size="huge" :bordered=" false " header-style="padding-bottom: 0;">
          <n-menu :options=" materialMenuOptions " />
        </n-card>
      </n-gi>

      <n-gi v-if=" accountStore.authorizedModules.includes( 'see_system_group' ) ">
        <n-card class="main-card" title="系統管理" size="huge" :bordered=" false " header-style="padding-bottom: 0;">
          <n-menu :options=" systemMenuOptions " />
        </n-card>
      </n-gi>

    </n-grid>
  </main>
</template>



<style scoped>
main .n-card {
  background-color: transparent;
}

.n-grid > div {
  border: 1px solid white;
  border-radius: 4px;
  background-color: hsla(0, 0%, 100%, 0.8);
  backdrop-filter: unset;
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0px 4px 20px -4px hsla(0, 0%, 60%, 0.4);
}
</style>
