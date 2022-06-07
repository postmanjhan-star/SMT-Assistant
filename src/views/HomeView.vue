<script setup>
import { onBeforeMount } from "vue";
import { RouterView, useRouter } from "vue-router";
import { NConfigProvider, darkTheme, NSpace, NLayoutHeader } from "naive-ui";
import { NPopover, NMenu, NDropdown, NCard, NButton, NIcon, NH1 } from "naive-ui";
import * as jose from 'jose';
import { systemMenuOptions } from "../menuOptions";
import Switcher from '@carbon/icons-vue/es/switcher/32';
import { useAuthStore } from '../stores/auth';
import { useAccountStore } from '../stores/account';

const router = useRouter();
const appTitle = import.meta.env.VITE_APP_TITLE;
const authStore = useAuthStore();
const token = JSON.parse( authStore.accountToken )[ 'access_token' ];
const claims = jose.decodeJwt( token );

const accountMenuOptions = [
  {
    label: '登出',
    key: 'logout',
    disabled: false,
  },
]

const accountStore = useAccountStore();
// console.debug( 'HomeView authorizedModules 1:\n', accountStore.authorizedModules );

onBeforeMount( async () => {
  await accountStore.setAuthorizedModules();
} );

function handleAccountMenuSelect ( key ) {
  if ( key === 'logout' ) {
    authStore.accountToken = null;
    accountStore.authorizedModules = [];
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
                <n-card title="物料管理" size="small" :bordered=" false "></n-card>
                <n-card title="系統管理" size="small" :bordered=" false "
                  v-if=" accountStore.authorizedModules.includes( 'see_system_group' ) "
                  header-style="padding-bottom: 0;" content-style="padding-left: 0;">
                  <n-menu :options=" systemMenuOptions " :root-indent=" 16 " />
                </n-card>
              </n-space>
            </n-popover>
            <n-h1
              style="display: inline-block; font-size: 1rem; font-weight: bolder; line-height: 28px; margin: 0; vertical-align: middle; height: 28px;">
              {{ appTitle }}
            </n-h1>
          </div>

          <n-dropdown :options=" accountMenuOptions " trigger="click" :show-arrow=" true " size="huge"
            @select=" handleAccountMenuSelect ">
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
