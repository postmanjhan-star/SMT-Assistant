<script setup lang="ts">
import { useMeta } from 'vue-meta'
import { RouterView } from "vue-router"

useMeta( { title: 'Start' } )
</script>

<template>
  <!-- The ghost component for vue-meta -->
  <metainfo></metainfo>
  <RouterView />
</template>

<style>
/* Make AG-Grid cell content at middle in vertical */
.ag-cell-wrapper {
  height: 100%;
}
</style>
