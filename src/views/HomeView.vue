<script setup lang="ts">
import Switcher from '@carbon/icons-vue/es/switcher/32';
import * as jose from 'jose';
import { darkTheme, NButton, NCard, NConfigProvider, NDivider, NDropdown, NH1, NIcon, NLayoutHeader, NMenu, NPopover, NSpace, NTag } from "naive-ui";
import { RouterView, useRouter } from "vue-router";
import { materialMenuOptions, purchaseMenuOptions, systemMenuOptions } from "../menuOptions";
import { useAccountStore } from '../stores/account';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const appTitle = import.meta.env.VITE_APP_TITLE;
const appEnv = import.meta.env.MODE;
const authStore = useAuthStore();
const accountStore = useAccountStore();
const token = JSON.parse( authStore.accountToken )[ 'access_token' ];
const claims = jose.decodeJwt( token );

const accountMenuOptions = [ { label: '登出', key: 'logout', disabled: false } ]


async function onSelectAccountMenu ( key: string ) {
  if ( key === 'logout' ) {
    await authStore.logout();
    router.push( { name: 'Login' } );
  }
}
</script>



<template>
  <header style="position: sticky; top: 0; z-index: 2;">
    <n-config-provider :theme=" darkTheme ">
      <n-layout-header style="padding: 16px;">
        <n-space item-style="" justify="space-between">
          <div style="">
            <n-popover trigger="click" style="max-width: 80vw; max-height: 90vh;" scrollable>
              <template #trigger>
                <n-button style="font-size: 24px; vertical-align: middle; margin-right: 20px;" text>
                  <n-icon>
                    <Switcher></Switcher>
                  </n-icon>
                </n-button>
              </template>
              <n-space size="large">

                <n-card title="基本資料管理" size="small" :bordered=" false " header-style="padding-bottom: 0;"
                  content-style="padding-left: 0;">
                  <n-menu :options=" purchaseMenuOptions " :root-indent=" 16 " />
                </n-card>

                <n-card title="收發作業" size="small" :bordered=" false " header-style="padding-bottom: 0;"
                  content-style="padding-left: 0;">
                  <n-menu :options=" materialMenuOptions " :root-indent=" 16 " />
                </n-card>

                <n-card title="系統管理" size="small" :bordered=" false " header-style="padding-bottom: 0;"
                  content-style="padding-left: 0;"
                  v-if=" accountStore.authorizedModules.includes( 'see_system_group' ) ">
                  <n-menu :options=" systemMenuOptions " :root-indent=" 16 " />
                </n-card>

              </n-space>
            </n-popover>
            <n-h1
              style="display: inline-block; font-size: 1rem; font-weight: bolder; line-height: 28px; margin: 0; vertical-align: middle; height: 28px;">
              {{ appTitle }}
            </n-h1>
            <span v-if="appEnv === 'development'">
              <n-divider vertical />
              <n-tag size="small" type="error" strong :bordered="false">開發</n-tag>
            </span>
            <span v-if="appEnv === 'staging'">
              <n-divider vertical />
              <n-tag size="small" type="warning" strong :bordered="false">測試</n-tag>
            </span>
          </div>

          <n-dropdown :options=" accountMenuOptions " trigger="click" :show-arrow=" true " size="huge"
            @select=" onSelectAccountMenu ">
            <n-button style="vertical-align: middle; height: 28px; line-height: 28px;" text>
              {{ claims.sub }}
            </n-button>
          </n-dropdown>
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
