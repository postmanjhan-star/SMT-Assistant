<script setup lang="ts">
import { NGrid, NSpace } from "naive-ui"
</script>

<template>
  <n-space vertical :wrap-item="false" class="page-container">
    <n-space vertical size="small" class="sticky-header">
      <slot name="header" />

      <n-grid cols="2 s:2" responsive="screen" x-gap="20">
        <slot name="inputs" />
      </n-grid>
    </n-space>

    <div class="grid-wrapper">
      <slot />
    </div>
  </n-space>
</template>

<style scoped>
.page-container {
  --panasonic-header-offset: 60px;
  height: calc(100vh - var(--panasonic-header-offset));
}

.sticky-header {
  padding: 0 1rem;
  position: sticky;
  top: 0;
  background-color: var(--table-color);
  z-index: 1;
}

.grid-wrapper {
  height: 2000px;
  padding: 1rem;
}
</style>
