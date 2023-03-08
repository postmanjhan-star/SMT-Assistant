<script setup lang="ts">
import { dateZhTW, GlobalThemeOverrides, NA, NCard, NConfigProvider, NLayout, NLayoutSider, NLayoutContent, NMessageProvider, NNotificationProvider, NSpace, zhTW } from 'naive-ui';
import { useMeta } from 'vue-meta';
import { RouterView } from "vue-router";

const lightThemeBorderColor = 'rgba(214, 214, 214, 1.0)' // hsla(0, 0%, 84%, 1.0)
const lightThemeRailColor = 'rgba(153, 153, 153. 1.0)' // hsla(0, 0%, 60%, 1.0)
const lightThemeInputColor = 'rgba(245, 245, 245, 1.0)' // hsla(0, 0%, 96%, 1.0)
const lightThemeBodyColor = 'rgba(182, 212, 246, 1.0)' // hsla(212, 78%, 84%, 1)

/**
 * js 文件下使用这个做类型提示
 * @type import('naive-ui').GlobalThemeOverrides
 */
const lightThemeOverrides: GlobalThemeOverrides = {
    common: {
        fontWeightStrong: "600",
        dividerColor: lightThemeBorderColor,
        inputColor: lightThemeInputColor,
        bodyColor: lightThemeBodyColor,
    },
    Layout: {
        siderColor: lightThemeBodyColor,
    },
    DataTable: {
        borderColor: lightThemeBorderColor,
    },
    Switch: {
        railColor: lightThemeRailColor,
    },
}

useMeta( { title: '溫溼度' } )
</script>

<template>
    <n-config-provider :locale=" zhTW " :date-locale=" dateZhTW " inline-theme-disabled
        :theme-overrides=" lightThemeOverrides ">
        <n-message-provider>
            <n-notification-provider>
                <n-layout has-sider>
                    <n-layout-sider content-style="padding: 24px;" width="11rem">
                        <n-space size="large" vertical>
                            <router-link to="/temperature-humidity" #=" { navigate, href } " custom>
                                <n-a :href=" href " @click=" navigate ">
                                    <n-card size="huge"
                                        style="border-radius: 30px; box-shadow: 10px 10px 6px hsla(0, 0%, 0%, 0.16); border: none; margin-block-end: 20px;"
                                        hoverable>
                                        <div
                                            style="text-align: center; font-size: 40px; line-height: 100%; text-align: center; line-height: 100%; margin-block-end: 1rem;">
                                            🏠
                                        </div>
                                        <div
                                            style="color: hsla(0, 0%, 72%, 1); font-size: 20px; text-align: center; line-height: 100%;">
                                            首頁
                                        </div>
                                    </n-card>
                                </n-a>
                            </router-link>

                            <router-link to="/temperature-humidity/query" #=" { navigate, href } " custom>
                                <n-a :href=" href " @click=" navigate ">
                                    <n-card size="huge"
                                        style="border-radius: 30px; box-shadow: 10px 10px 6px hsla(0, 0%, 0%, 0.16); border: none;"
                                        hoverable>
                                        <div
                                            style="text-align: center; font-size: 40px; line-height: 100%; text-align: center; line-height: 100%; margin-block-end: 1rem;">
                                            🔍
                                        </div>
                                        <div
                                            style="color: hsla(0, 0%, 72%, 1); font-size: 20px; text-align: center; line-height: 100%;">
                                            查詢
                                        </div>
                                    </n-card>
                                </n-a>
                            </router-link>
                        </n-space>
                    </n-layout-sider>
                    <n-layout>
                        <n-layout-content content-style="padding: 24px;">
                            <router-view></router-view>
                        </n-layout-content>
                    </n-layout>
                </n-layout>

            </n-notification-provider>
        </n-message-provider>
    </n-config-provider>
</template>

<style>
body {
  background-color: hsla(212, 78%, 84%, 1);
}

.n-a {
  text-decoration: none;
}
</style>
