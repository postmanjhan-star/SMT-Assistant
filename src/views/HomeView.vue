<script setup lang="ts">
import { h } from "vue";
import TheWelcome from "../components/TheWelcome.vue";
import { NLayout, NLayoutSider, NLayoutHeader, NLayoutContent, NMenu, NIcon, NEmpty, NButton } from "naive-ui";

const menuOptions = [
  {
    label: () =>
      h(
        'a',
        {
          href: 'https://baike.baidu.com/item/%E4%B8%94%E5%90%AC%E9%A3%8E%E5%90%9F',
        },
        '且听风吟'
      ),
    key: 'hear-the-wind-sing',
  },
  {
    label: '1973年的弹珠玩具',
    key: 'pinball-1973',
    disabled: true,
    children: [
      {
        label: '鼠',
        key: 'rat'
      }
    ]
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
          {
            label: '羊男',
            key: 'sheep-man',
          }
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
      {
        label: '食物',
        key: 'food',
        children: [
          {
            label: '三明治',
            key: 'sandwich'
          }
        ]
      },
      {
        label: '过去增多，未来减少',
        key: 'the-past-increases-the-future-recedes'
      }
    ]
  }
];
</script>

<template>
  <n-layout has-sider>
    <n-layout-sider collapse-mode="width" show-trigger="bar" content-style="padding: 24px;" inverted>
      <n-menu :options=" menuOptions " />
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
      </n-layout-content>
    </n-layout>
  </n-layout>
</template>
