<script setup lang="ts">
import { useMeta } from 'vue-meta';
import { RouterView } from "vue-router";

useMeta( { title: 'Start' } );
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

/* .n-input {
  box-shadow: inset 0px 0px 4px 0px hsla(0deg, 0%, 60% , 1.0);
}

.n-base-selection-label {
  box-shadow: inset 0px 0px 4px 0px hsla(0deg, 0%, 60% , 1.0);
}

.n-base-selection-tags {
  box-shadow: inset 0px 0px 4px 0px hsla(0deg, 0%, 60% , 1.0);
} */
</style>
