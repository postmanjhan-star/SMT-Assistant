<script setup lang="ts">
import { NPageHeader, NSpace, NTag } from "naive-ui"
import MounterInfoBar from "@/pages/components/shared/MounterInfoBar.vue"

const MODE_NAME_TESTING = "🧪 試產生產模式"
const MODE_NAME_NORMAL = "✅ 正式生產模式"

defineProps<{
  mounterIdno: string
  isTestingMode: boolean
  workOrderIdno: string
  productIdno: string
  boardSide: string
  operatorName: string
  operatorIdno?: string
}>()

defineEmits<{
  (e: "back"): void
}>()
</script>

<template>
  <n-page-header @back="$emit('back')" class="page-header">
    <template #title>
      <div class="page-title">
        <span>{{ mounterIdno }}</span>
        <n-tag
          data-testid="fuji-mode-tag"
          :type="isTestingMode ? 'warning' : 'success'"
          size="small"
          bordered
        >
          {{ isTestingMode ? MODE_NAME_TESTING : MODE_NAME_NORMAL }}
        </n-tag>
        <slot name="mode-extra" />
      </div>
    </template>
    <template #default>
      <div class="page-toolbar">
        <MounterInfoBar
          :work-order="workOrderIdno"
          :product="productIdno"
          :board-side="boardSide"
          :operator-name="operatorName"
          :operator-idno="operatorIdno"
        />

        <n-space size="small">
          <slot name="actions" />
        </n-space>
      </div>
    </template>
  </n-page-header>
</template>

<style scoped>
.page-header {
  margin-bottom: 1rem;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.page-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}
</style>
