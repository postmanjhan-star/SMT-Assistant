<script setup lang="ts">
import { darkTheme, dateZhTW, GlobalThemeOverrides, NConfigProvider, NEl, NMessageProvider, NSpace, zhTW } from 'naive-ui';
import { h, ref } from 'vue';
import { RouterLink, RouterView } from 'vue-router';


const darkThemeOverrides: GlobalThemeOverrides = {
  common: {
    fontWeightStrong: "600",
    inputColor: 'rgba(255, 255, 255, 0.1)'
  },
  DataTable: {
    borderColor: 'rgba(45, 45, 48, 1)',
  },
  Table: {
    borderColor: 'rgba(45, 45, 48, 1)',
  }
};



const activeKey = ref<string | null>( 'smt-home' );



const menuOptions = [
  { label: () => h( RouterLink, { to: '/smt/panasonic-mounter' }, { default: () => '松下打件機上料助手' } ), key: 'panasonic' },
  { label: () => h( RouterLink, { to: '/smt/fuji-mounter' }, { default: () => '富士打件機上料助手' } ), key: 'fuji' },
  { label: () => h( RouterLink, { to: '/smt/task-manager' }, { default: () => '打件工作管理' } ), key: 'taskmanager' }
];

// Take background colors from https://windicss.org/utilities/general/colors.html
</script>



<template>
  <n-config-provider :theme=" darkTheme " :theme-overrides=" darkThemeOverrides " :locale=" zhTW "
    :date-locale=" dateZhTW " inline-theme-disabled>
    <n-message-provider>

      <header style="position: sticky; top: 0; z-index: 2;">
        <n-layout-header style="padding: 9px;">
          <n-space item-style="" justify="space-between">
            <n-menu v-model:value="activeKey" mode="horizontal" :options="menuOptions" />
          </n-space>
        </n-layout-header>
      </header>

      <!-- Hide unused menu -->
      <!--<main style="min-height: calc(100vh - 60px); background-color: #44403c;">-->

      <n-el tag="main" style="min-height: calc(100vh - 60px); background-color: var(--body-color);">
        <router-view></router-view>
      </n-el>

    </n-message-provider>
  </n-config-provider>
</template>
    