<script setup lang="ts">
import "ag-grid-community/styles/ag-grid.css"
import "ag-grid-community/styles/ag-theme-balham.css"
import { AgGridVue } from "ag-grid-vue3"
import { NButton, NGi } from "naive-ui"
import { ref } from "vue"
import { useMeta } from "vue-meta"

import MaterialInventoryBarcodeInput from "@/pages/components/MaterialInventoryBarcodeInput.vue"
import SlotIdnoInput from "@/pages/components/SlotIdnoInput.vue"
import FujiMounterLayout from "@/pages/components/fuji/FujiMounterLayout.vue"
import FujiMounterHeader from "@/pages/components/fuji/FujiMounterHeader.vue"
import { parseFujiSlotInput } from "@/domain/slot/FujiSlotParser"
import { useFujiDetailPage } from "@/ui/workflows/preproduction/fuji/composables/useFujiDetailPage"

useMeta({ title: "Fuji Mounter Assistant" })

const slotIdnoInput = ref<{ focus: () => void } | null>(null)

const {
  workOrderIdno,
  productIdno,
  boardSide,
  mounterIdno,
  isTestingMode,
  currentUsername,
  rowData,
  gridOptions,
  onGridReady,
  onClickBackArrow,
  productionStarted,
  onProduction,
  onStopProduction,
  materialInventory,
  materialResetKey,
  getMaterialMatchedRows,
  scanMaterial,
  handleMaterialMatched,
  handleMaterialError,
  handleSlotSubmit,
  showError,
} = useFujiDetailPage({
  focusSlotInput: () => slotIdnoInput.value?.focus(),
})
</script>

<template>
  <FujiMounterLayout>
    <template #header>
      <FujiMounterHeader
        :mounter-idno="mounterIdno"
        :is-testing-mode="isTestingMode"
        :work-order-idno="workOrderIdno"
        :product-idno="productIdno"
        :board-side="boardSide"
        :operator-name="currentUsername"
        @back="onClickBackArrow"
      >
        <template #actions>
          <n-button v-if="!productionStarted" type="success" size="small" @click="onProduction">
            🚀 開始生產
          </n-button>
          <n-button v-else type="error" size="small" @click="onStopProduction">
            🛑 結束生產
          </n-button>
        </template>
      </FujiMounterHeader>
    </template>

    <template #inputs>
      <n-gi>
        <MaterialInventoryBarcodeInput
          :disabled="productionStarted"
          :is-testing-mode="isTestingMode"
          :get-material-matched-rows="getMaterialMatchedRows"
          :reset-key="materialResetKey"
          :scan="scanMaterial"
          :allow-no-match-in-testing="true"
          @matched="handleMaterialMatched"
          @error="handleMaterialError"
        />
      </n-gi>

      <n-gi>
        <SlotIdnoInput
          ref="slotIdnoInput"
          :disabled="productionStarted"
          :is-testing-mode="isTestingMode"
          :has-material="!!materialInventory"
          :parse-slot-idno="parseFujiSlotInput"
          @submit="handleSlotSubmit"
          @error="showError"
        />
      </n-gi>
    </template>

    <ag-grid-vue
      class="ag-theme-balham-dark"
      :rowData="rowData"
      style="height: 100%"
      :gridOptions="gridOptions"
      @grid-ready="onGridReady"
    />
  </FujiMounterLayout>
</template>

<style>
.ag-cell-wrapper {
  height: 100%;
}
</style>
