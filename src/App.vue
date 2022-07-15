<script setup>
import { RouterView } from "vue-router";
import { NConfigProvider, NMessageProvider } from 'naive-ui';
import { zhTW, dateZhTW } from 'naive-ui';
import Color from 'color';

const borderColor = Color( 'hsla(0, 0%, 84%, 1.0)' );
const railColor = Color( 'hsla(0, 0%, 60%, 1.0)' )
const inputColor = Color(  'hsla(0, 0%, 96%, 1.0)' );

/**
 * js 文件下使用这个做类型提示
 * @type import('naive-ui').GlobalThemeOverrides
 */
const themeOverrides = {
  common: {
    fontWeightStrong: "600",
    dividerColor: borderColor.rgb().string(),
    inputColor: inputColor.rgb().string(),
  },
  DataTable: {
    borderColor: borderColor.rgb().string(),
  },
  Switch: {
    railColor: railColor.rgb().string(),
  },
}
</script>

<template>
  <n-config-provider :locale=" zhTW " :date-locale=" dateZhTW " inline-theme-disabled
    :theme-overrides=" themeOverrides ">
    <n-message-provider>
      <header>
        <!-- <img alt="Vue logo" class="logo" src="@/assets/logo.svg" width="125" height="125" /> -->
      </header>
      <RouterView />
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
