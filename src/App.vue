<script setup lang="ts">
import { useMeta } from 'vue-meta'
import { RouterView } from "vue-router"
import { useDialog } from 'naive-ui'

useMeta({ title: 'Start' })
</script>


<template>
  <!-- The ghost component for vue-meta -->
  <metainfo></metainfo>
  <n-dialog-provider>
    <RouterView />
  </n-dialog-provider>
</template>

<style>
/* Make AG-Grid cell content at middle in vertical */
.ag-cell-wrapper {
  height: 100%;
}
</style>
