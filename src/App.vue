<script setup lang="ts">
import { dateZhTW, GlobalThemeOverrides, NConfigProvider, NMessageProvider, NNotificationProvider, zhTW } from 'naive-ui';
import { useMeta } from 'vue-meta';
import { RouterView } from "vue-router";

const lightThemeBorderColor = 'rgba(214, 214, 214, 1.0)'; // hsla(0, 0%, 84%, 1.0)
const lightThemeRailColor = 'rgba(153, 153, 153. 1.0)'; // hsla(0, 0%, 60%, 1.0)
const lightThemeInputColor = 'rgba(245, 245, 245, 1.0)'; // hsla(0, 0%, 96%, 1.0)

/**
 * js 文件下使用这个做类型提示
 * @type import('naive-ui').GlobalThemeOverrides
 */
const lightThemeOverrides: GlobalThemeOverrides = {
  common: {
    fontWeightStrong: "600",
    dividerColor: lightThemeBorderColor,
    inputColor: lightThemeInputColor,
  },
  DataTable: {
    borderColor: lightThemeBorderColor,
  },
  Switch: {
    railColor: lightThemeRailColor,
  },
}

useMeta( { title: 'Start' } );
</script>

<template>
  <!-- The ghost component for vue-meta -->
  <metainfo></metainfo>
  <n-config-provider :locale=" zhTW " :date-locale=" dateZhTW " inline-theme-disabled
    :theme-overrides=" lightThemeOverrides ">
    <n-message-provider>
      <n-notification-provider>
        <RouterView />
      </n-notification-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<style>
/* Make AG-Grid cell content at middle in vertical */
.ag-cell-wrapper {
  height: 100%;
}

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
