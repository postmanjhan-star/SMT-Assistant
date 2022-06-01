<script setup>
import { NGrid, NGi } from "naive-ui";
import { NMenu } from "naive-ui";
import { NCard } from "naive-ui";
import { systemMenuOptions } from "../menuOptions";
import backgroundImageUrl from '../assets/shapes-6393929_1920.jpg'
</script>

<template>
  <main :style=" { backgroundImage: `url(${ backgroundImageUrl })` } "
    style="padding: 1rem; min-height: calc(100vh - 92px); background-repeat: no-repeat; background-attachment: fixed; background-size: cover; background-position: center; background-color: hsla(0, 0%, 84%, 1.0);">
    <n-grid cols="1 s:2 m:4 xl:5" responsive="screen" :x-gap=" 20 " :y-gap=" 20 ">
      <n-gi>
        <n-card class="main-card" title="物料管理" size="Huge" :bordered=" false " header-style="padding-bottom: 0;">
        </n-card>
      </n-gi>
      <n-gi>
        <n-card class="main-card" title="系統管理" size="Huge" :bordered=" false " header-style="padding-bottom: 0;">
          <n-menu :options=" systemMenuOptions " />
        </n-card>
      </n-gi>
    </n-grid>

    <!-- <section>
      <n-empty description="你什么也找不到" size="huge">
        <template #extra>
          <n-button size="large">
            看看别的
          </n-button>
        </template>
      </n-empty>
    </section> -->
  </main>
</template>

<style scoped>
main .n-card {
  background-color: transparent;
}

.n-grid>div {
  border: 1px solid white;
  border-radius: 4px;
  background-color: hsla(0, 0%, 100%, 0.6);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0px 4px 20px -4px hsla(0, 0%, 60%, 0.4);
}
</style>
