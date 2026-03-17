<script setup lang="ts">
import { computed } from "vue"
import { NGrid, NSpace } from "naive-ui"

const props = withDefaults(
  defineProps<{
    stickyInputs?: boolean
    gridCols?: string
    stickyTop?: string
    bgColor?: string
  }>(),
  {
    stickyInputs: true,
    gridCols: "1 s:2",
    stickyTop: "60px",
    bgColor: "var(--body-color)",
  }
)

const stickyHeaderStyle = computed(() => ({
  top: props.stickyTop,
  backgroundColor: props.bgColor,
}))
</script>

<template>
  <n-space vertical :wrap-item="false" class="page-container">
    <n-space vertical size="small" class="sticky-header" :style="stickyHeaderStyle">
      <slot name="header" />

      <n-grid v-if="stickyInputs" :cols="gridCols" responsive="screen" x-gap="20">
        <slot name="inputs" />
      </n-grid>
    </n-space>

    <n-grid v-if="!stickyInputs" :cols="gridCols" responsive="screen" x-gap="20" class="input-panel">
      <slot name="inputs" />
    </n-grid>

    <div class="grid-wrapper">
      <slot />
    </div>
  </n-space>
</template>

<style scoped>
.page-container {
  height: calc(100vh - 60px);
}

.sticky-header {
  padding: 0 1rem;
  position: sticky;
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
