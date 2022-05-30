<script setup>
import { RouterView } from "vue-router";
import { NConfigProvider, darkTheme, NSpace, NLayoutHeader } from "naive-ui";
import { NPopover, NMenu, NCard, NButton, NIcon, NH1 } from "naive-ui";
import { systemMenuOptions } from "../menuOptions";
import Switcher from '@carbon/icons-vue/es/switcher/32';

const appTitle = import.meta.env.VITE_APP_TITLE;
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

  <router-view></router-view>
</template>

<style scoped>
.n-card {
  width: 200px;
}
</style>
