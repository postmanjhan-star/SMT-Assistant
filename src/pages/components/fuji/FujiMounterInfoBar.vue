<script setup lang="ts">
import { NP, NSpace, NTag } from "naive-ui"

defineProps<{
  workOrder: string
  product: string
  boardSide: string
}>()
</script>

<template>
  <n-space size="small">
    <n-p>工單：<n-tag type="info" size="small">{{ workOrder }}</n-tag></n-p>
    <n-p>成品料號：<n-tag type="info" size="small">{{ product }}</n-tag></n-p>
    <n-p>工件面向：<n-tag type="info" size="small">{{ boardSide }}</n-tag></n-p>
  </n-space>
</template>
