<script setup lang="ts">
import { darkTheme, GlobalThemeOverrides, NConfigProvider, NEl, NSpace } from 'naive-ui';
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
  { label: () => h( RouterLink, { to: '/accounts' }, { default: () => 'Home' } ), key: 'smt-home' },
  { label: () => h( RouterLink, { to: '/accounts' }, { default: () => 'Settings' } ), key: 'smt-settings' },
];

// Take background colors from https://windicss.org/utilities/general/colors.html
</script>



<template>
  <n-config-provider :theme=" darkTheme " :theme-overrides=" darkThemeOverrides ">
    <header style="position: sticky; top: 0; z-index: 2;">
      <n-layout-header style="padding: 9px;">
        <n-space item-style="" justify="space-between">
          <!-- Hide unused menu -->
          <!-- <n-menu v-model:value="activeKey" mode="horizontal" :options="menuOptions" /> -->
        </n-space>
      </n-layout-header>
    </header>

    <!-- Hide unused menu -->
    <!--<main style="min-height: calc(100vh - 60px); background-color: #44403c;">-->

    <n-el tag="main" style="min-height: calc(100vh - 18px); background-color: var(--body-color);">
      <router-view></router-view>
    </n-el>
  </n-config-provider>
</template>
    