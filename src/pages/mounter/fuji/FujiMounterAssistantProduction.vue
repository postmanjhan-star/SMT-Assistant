<script setup lang="ts">
import "ag-grid-community/styles/ag-grid.css"
import "ag-grid-community/styles/ag-theme-balham.css"
import { AgGridVue } from "ag-grid-vue3"
import { NButton, NForm, NFormItem, NGi, NInput, NTag } from "naive-ui"
import { useMeta } from "vue-meta"

import MaterialQueryModal from "@/pages/mounter/fuji/components/MaterialQueryModal.vue"
import FujiMounterLayout from "@/pages/components/fuji/FujiMounterLayout.vue"
import FujiMounterHeader from "@/pages/components/fuji/FujiMounterHeader.vue"
import { useFujiProductionPage } from "@/ui/workflows/post-production/fuji/composables/useFujiProductionPage"
import { createFujiProductionGridOptions } from "@/ui/workflows/post-production/fuji/createFujiProductionGridOptions"

useMeta({ title: "Fuji Mounter Production" })

const {
  workOrderIdno,
  productIdno,
  mounterIdno,
  boardSide,
  isTestingMode,
  productionUuid,
  productionStarted,
  rowData,
  materialFormValue,
  slotFormValue,
  materialInputRef,
  slotInputRef,
  showMaterialQueryModal,
  onGridReady,
  onClickBackArrow,
  onSubmitMaterialInventoryForm,
  onSubmitSlotForm,
  onStopProduction,
  onMaterialQuery,
  showError,
} = useFujiProductionPage()

const gridOptions = createFujiProductionGridOptions()
</script>

<template>
  <MaterialQueryModal v-model:show="showMaterialQueryModal" :uuid="productionUuid" @error="showError" />

  <FujiMounterLayout :sticky-inputs="false">
    <template #header>
      <FujiMounterHeader
        :mounter-idno="mounterIdno"
        :is-testing-mode="isTestingMode"
        :work-order-idno="workOrderIdno"
        :product-idno="productIdno"
        :board-side="boardSide ?? ''"
        @back="onClickBackArrow"
      >
        <template #actions>
          <n-button v-if="productionStarted" type="error" size="small" @click="onStopProduction">
            🛑 結束生產
          </n-button>
          <n-tag v-else type="success" size="small">生產已結束</n-tag>
          <n-button type="info" size="small" @click="onMaterialQuery">🔍 接料查詢</n-button>
        </template>
      </FujiMounterHeader>
    </template>

    <template #inputs>
      <n-gi>
        <n-form size="large" :model="materialFormValue" @submit.prevent="onSubmitMaterialInventoryForm">
          <n-form-item label="物料單包條碼">
            <n-input
              data-testid="material-input"
              type="text"
              size="large"
              v-model:value.lazy="materialFormValue.materialInventoryIdno"
              autofocus
              ref="materialInputRef"
              :disabled="!productionStarted"
              placeholder="請掃描物料"
            />
          </n-form-item>
        </n-form>
      </n-gi>
      <n-gi>
        <n-form size="large" :model="slotFormValue" @submit.prevent="onSubmitSlotForm">
          <n-form-item label="位置">
            <n-input
              type="text"
              size="large"
              v-model:value.lazy="slotFormValue.slotIdno"
              ref="slotInputRef"
              :disabled="!productionStarted"
              placeholder="請掃描槽位"
            />
          </n-form-item>
        </n-form>
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
