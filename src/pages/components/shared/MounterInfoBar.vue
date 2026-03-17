<script setup lang="ts">
import { NP, NSpace, NTag } from "naive-ui"

defineProps<{
  workOrder: string
  product: string
  boardSide: string
  operatorName: string
  machineSide?: string
}>()
</script>

<template>
  <n-space size="small">
    <n-p>工單：<n-tag type="info" size="small">{{ workOrder }}</n-tag></n-p>
    <n-p>成品料號：<n-tag type="info" size="small">{{ product }}</n-tag></n-p>
    <n-p>工件面向：<n-tag type="info" size="small">{{ boardSide }}</n-tag></n-p>
    <n-p v-if="machineSide">機台面向：<n-tag type="info" size="small">{{ machineSide }}</n-tag></n-p>
    <n-p>上料人員：<n-tag type="info" size="small">{{ operatorName }}</n-tag></n-p>
  </n-space>
</template>
