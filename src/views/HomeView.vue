<script setup>
import { h, ref } from "vue";
import { RouterView, RouterLink } from "vue-router";
import { NConfigProvider, darkTheme, NSpace, NLayoutHeader } from "naive-ui";
import { NGrid, NGi } from "naive-ui";
import { NPopover, NCard, NButton, NIcon, NH1, NA } from "naive-ui";
import Switcher from '@carbon/icons-vue/es/switcher/32';
import backgroundImageUrl from '../assets/shapes-6393929_1920.jpg'

const appTitle = import.meta.env.VITE_APP_TITLE;

const systemMenuOptions = [
  {
    label: () =>
      h(
        RouterLink,
        {
          to: '/accounts',
        },
        { default: () => '帳號管理' },
      ),
    key: 'accounts'
  },
];
</script>

<template>
  <header style="position: sticky; top: 0; z-index: 1;">
    <n-config-provider :theme=" darkTheme ">
      <n-layout-header style="padding: 16px;">
        <n-space item-style="line-height: 0;">
          <n-popover trigger="click" style="max-width: 80vw; max-height: 90vh;" scrollable>
            <template #trigger>
              <n-button style="font-size: 24px;" text>
                <n-icon>
                  <Switcher></Switcher>
                </n-icon>
              </n-button>
            </template>
            <n-space size="large">
              <n-card title="物料管理" size="small" :bordered=" false "></n-card>
              <n-card title="系統管理" size="small" :bordered=" false " header-style="padding-bottom: 0;"
                content-style="padding-left: 0;">
                <n-menu :options=" systemMenuOptions " :root-indent=" 16 " />
              </n-card>
            </n-space>
          </n-popover>
          <n-h1 style="display: inline-block; font-size: 1rem; font-weight: bolder; line-height: 150%; margin: 0;">
            {{
                appTitle
            }}
          </n-h1>
        </n-space>
      </n-layout-header>
    </n-config-provider>
  </header>

  <main :style=" { backgroundImage: `url(${ backgroundImageUrl })` } "
    style="padding: 1rem; min-height: calc(100vh - 88px); background-repeat: no-repeat; background-attachment: fixed; background-size: cover; background-position: center; ">
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
    <router-view></router-view>

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
.n-card {
  width: 200px;
}

main .n-card {
  background-color: transparent;
}

.n-grid>div {
  border: 1px solid lightgray;
  border-radius: 4px;
  background-color: hsla(0, 0%, 100%, 0.6);
  backdrop-filter: blur(8px);
}
</style>
