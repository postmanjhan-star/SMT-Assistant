<script setup lang="ts">
import * as Color from 'color';
import { dateZhTW, NConfigProvider, NMessageProvider, zhTW, NNotificationProvider, GlobalThemeOverrides, GlobalTheme } from 'naive-ui';
import { RouterView } from "vue-router";

const lightThemeBorderColor = Color( 'hsla(0, 0%, 84%, 1.0)' );
const lightThemeRailColor = Color( 'hsla(0, 0%, 60%, 1.0)' );
const lightThemeInputColor = Color( 'hsla(0, 0%, 96%, 1.0)' );

/**
 * js 文件下使用这个做类型提示
 * @type import('naive-ui').GlobalThemeOverrides
 */
const lightThemeOverrides: GlobalThemeOverrides = {
  common: {
    fontWeightStrong: "600",
    dividerColor: lightThemeBorderColor.rgb().string(),
    inputColor: lightThemeInputColor.rgb().string(),
  },
  DataTable: {
    borderColor: lightThemeBorderColor.rgb().string(),
  },
  Switch: {
    railColor: lightThemeRailColor.rgb().string(),
  },
}
</script>

<template>
  <n-config-provider :locale=" zhTW " :date-locale=" dateZhTW " inline-theme-disabled
    :theme-overrides=" lightThemeOverrides ">
    <n-message-provider>
      <n-notification-provider>
        <!-- <header>
          <img alt="Vue logo" class="logo" src="@/assets/logo.svg" width="125" height="125" />
        </header> -->
        <RouterView />
      </n-notification-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<style>
/* .n-input {
  box-shadow: inset 0px 0px 4px 0px hsla(0deg, 0%, 60% , 1.0);
}

.n-base-selection-label {
  box-shadow: inset 0px 0px 4px 0px hsla(0deg, 0%, 60% , 1.0);
}

.n-base-selection-tags {
  box-shadow: inset 0px 0px 4px 0px hsla(0deg, 0%, 60% , 1.0);
} */
</style>
