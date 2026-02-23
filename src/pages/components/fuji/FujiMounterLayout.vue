<script setup lang="ts">
import { NGrid, NSpace } from "naive-ui"

withDefaults(
  defineProps<{
    stickyInputs?: boolean
  }>(),
  {
    stickyInputs: true,
  }
)
</script>

<template>
  <n-space vertical :wrap-item="false" class="page-container">
    <n-space vertical size="small" class="sticky-header">
      <slot name="header" />

      <n-grid v-if="stickyInputs" cols="1 s:2" responsive="screen" x-gap="20">
        <slot name="inputs" />
      </n-grid>
    </n-space>

    <n-grid v-if="!stickyInputs" cols="1 s:2" responsive="screen" x-gap="20" class="input-panel">
      <slot name="inputs" />
    </n-grid>

    <div class="grid-wrapper">
      <slot />
    </div>
  </n-space>
</template>

<style scoped>
.page-container {
  --fuji-header-offset: 60px;
  height: calc(100vh - var(--fuji-header-offset));
}

.sticky-header {
  padding: 0 1rem;
  position: sticky;
  top: 60px;
  background-color: var(--body-color);
  z-index: 1;
}

.input-panel {
  padding: 0 1rem;
}

.grid-wrapper {
  height: 2000px;
  padding: 1rem;
}
</style>
