<script setup lang="ts">
import { h } from "vue";
import { RouterView, RouterLink } from "vue-router";
import TheWelcome from "../components/TheWelcome.vue";
import { NLayout, NLayoutSider, NLayoutHeader, NLayoutContent, NMenu, NIcon, NEmpty, NButton } from "naive-ui";

import type { MenuOption } from "naive-ui";

const menuOptions: MenuOption[] = [
  {
    label: () =>
      h(
        RouterLink,
        {
          to: {
            path: '/accounts'
          },
        },
        '且听风吟'
      ),
    key: 'hear-the-wind-sing',
  },
  {
    label: '寻羊冒险记',
    key: 'a-wild-sheep-chase',
    disabled: true
  },
  {
    label: '舞，舞，舞',
    key: 'dance-dance-dance',
    children: [
      {
        type: 'group',
        label: '人物',
        key: 'people',
        children: [
          {
            label: '叙事者',
            key: 'narrator',
          },
        ]
      },
      {
        label: '饮品',
        key: 'beverage',
        children: [
          {
            label: '威士忌',
            key: 'whisky'
          }
        ]
      },
    ]
  }
];
</script>

<template>
  <n-layout has-sider>
    <n-layout-sider collapse-mode="width" show-trigger="bar" content-style="padding: 24px;" inverted :collapsed-width="64">
      <n-menu :options=" menuOptions " inverted/>
    </n-layout-sider>
    <n-layout content-style="padding-left: 28px; padding-right: 28px;">
      <n-layout-header>
        颐和园路
      </n-layout-header>
      <n-layout-content>
        <!-- <TheWelcome /> -->
        <n-empty description="你什么也找不到" size="huge">
          <template #extra>
            <n-button size="large">
              看看别的
            </n-button>
          </template>
        </n-empty>
        <router-view></router-view>
      </n-layout-content>
    </n-layout>
  </n-layout>
</template>
