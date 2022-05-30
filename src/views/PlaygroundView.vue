<script setup>
import { ref, h } from 'vue';
import { RouterView, RouterLink } from "vue-router";
import { NConfigProvider, darkTheme, NLayoutHeader, NSpace } from 'naive-ui';
import { NGrid, NGi } from 'naive-ui';
import { NDrawer, NDrawerContent, NPopover, NIcon, NCard, NH1 } from 'naive-ui';
import { NResult, NButton } from 'naive-ui';
import Switcher from '@carbon/icons-vue/es/switcher/32';
import backgroundImageUrl from '../assets/shapes-6393929_1920.jpg'

const appTitle = import.meta.env.VITE_APP_TITLE;

let show = ref( true );

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

function handleButtonClick () {
    show.value = true;
}
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
                    <n-h1
                        style="display: inline-block; font-size: 1rem; font-weight: bolder; line-height: 140%; margin: 0;">
                        {{
                                appTitle
                        }}
                    </n-h1>
                </n-space>
            </n-layout-header>
        </n-config-provider>
    </header>

    <main :style=" { backgroundImage: `url(${ backgroundImageUrl })` } "
        style="padding: 1rem; background-repeat: no-repeat; background-attachment: fixed; background-size: cover; background-position: center; ">
        <n-grid cols="1 s:2 m:4 xl:5" responsive="screen" :x-gap=" 20 " :y-gap=" 20 ">
            <n-gi>
                <n-card class="main-card" title="物料管理" size="Huge" :bordered=" false "
                    header-style="padding-bottom: 0;">
                </n-card>
            </n-gi>
            <n-gi>
                <n-card class="main-card" title="系統管理" size="Huge" :bordered=" false "
                    header-style="padding-bottom: 0;">
                    <n-menu :options=" systemMenuOptions " />
                </n-card>
            </n-gi>
        </n-grid>
        <!-- <n-drawer v-model:show=" show " placement="left" :close-on-esc=" true " :show-mask=" false ">
            <n-drawer-content title="斯通纳" closable>
                《斯通纳》是美国作家约翰·威廉姆斯在 1965 年出版的小说。
            </n-drawer-content>
        </n-drawer> -->
        <n-result status="404" title="404 資源不存在" description="生活總歸帶點荒謬" size="huge">
            <template #footer>
                <n-button size="large" type="primary" @click=" handleButtonClick ">回首頁</n-button>
            </template>
        </n-result>
        <p>content</p>
        <p>content</p>
        <p>content</p>
        <p>content</p>
        <p>content</p>
        <p>content</p>
    </main>

</template>

<style scoped>
.n-grid>div {
    border: 1px solid lightgray;
    border-radius: 4px;
    background-color: hsla(0, 0%, 100%, 0.6);
    backdrop-filter: blur(8px);
}

main .n-card {
    background-color: transparent;
}
</style>
