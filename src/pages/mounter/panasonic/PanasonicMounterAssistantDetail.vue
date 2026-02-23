<script setup lang="ts">
import "ag-grid-community/styles/ag-grid.css"
import "ag-grid-community/styles/ag-theme-balham.css"
import { AgGridVue } from "ag-grid-vue3"
import { NButton, NGi, NPageHeader, NSpace, NTag } from "naive-ui"
import { ref } from "vue"
import { useMeta } from "vue-meta"

import MaterialInventoryBarcodeInput from "@/pages/components/MaterialInventoryBarcodeInput.vue"
import SlotIdnoInput from "@/pages/components/SlotIdnoInput.vue"
import StartProductionButton from "./components/StartProductionButton.vue"
import MaterialQueryModal from "./components/MaterialQueryModal.vue"
import PanasonicRollShortageModal from "@/pages/components/panasonic/PanasonicRollShortageModal.vue"
import PanasonicMounterLayout from "@/pages/components/panasonic/PanasonicMounterLayout.vue"
import PanasonicMounterInfoBar from "@/pages/components/panasonic/PanasonicMounterInfoBar.vue"

import type {
  InputComponentHandle,
  MaterialMatchedPayload,
  SlotInputResult,
} from "./types/production"
import { createProductionGridOptions } from "@/ui/workflows/preproduction/panasonic/createProductionGridOptions"
import { useSlotInputSelection } from "@/ui/shared/composables/useSlotInputSelection"
import { parsePanasonicSlotIdno } from "@/domain/slot/PanasonicSlotParser"
import { usePanasonicInputReset } from "@/ui/shared/composables/panasonic/usePanasonicInputReset"
import { usePanasonicDetailPage } from "@/ui/workflows/preproduction/panasonic/composables/usePanasonicDetailPage"
import {
  PANASONIC_MODE_NAME_NORMAL,
  PANASONIC_MODE_NAME_TESTING,
} from "@/ui/shared/composables/panasonic/usePanasonicConstants"

useMeta({ title: "Panasonic Mounter Assistant" })

type StartProductionButtonHandle = {
  submit: (rows?: unknown[]) => Promise<void> | void
}

const slotIdnoInput = ref<InputComponentHandle | null>(null)
const materialInventoryInput = ref<InputComponentHandle | null>(null)
const startProductionBtnRef = ref<StartProductionButtonHandle | null>(null)

const materialInventoryResult = ref<SlotInputResult | null>(null)

const inputs = useSlotInputSelection<SlotInputResult>({
  materialResult: materialInventoryResult,
  focusSlotInput: () => slotIdnoInput.value?.focus(),
})

const { resetInputsAfterSlotSubmit } = usePanasonicInputReset({
  clearMaterialResult: () => {
    materialInventoryResult.value = null
  },
  bumpResetKeys: () => inputs.bumpResetKeys(),
  materialInputRef: materialInventoryInput,
  slotInputRef: slotIdnoInput,
})

const {
  isTestingMode,
  workOrderIdno,
  productIdno,
  mounterIdno,
  machineSideQuery,
  workSheetSideQuery,
  currentUsername,
  rowData,
  productionStarted,
  productionUuid,
  showRollShortageModal,
  rollShortageFormRef,
  rollShortageFormValue,
  rollShortageRules,
  rollTypeOptions,
  showMaterialQueryModal,
  onGridReady,
  onClickBackArrow,
  onStopProduction,
  handleProductionStarted,
  onRollShortage,
  onSubmitShortage,
  closeRollShortage,
  onMaterialQuery,
  handleSlotSubmitWithPolicy,
  onRollShortageModalUpdate,
  getMaterialMatchedRows,
  showError,
} = usePanasonicDetailPage({
  onResetInputs: resetInputsAfterSlotSubmit,
  getSlotInputResult: () => materialInventoryResult.value,
  autoUploadRows: (rows) => {
    startProductionBtnRef.value?.submit(rows)
  },
})

const gridOptions = createProductionGridOptions(rowData)
const rollShortageBindings = { formRef: rollShortageFormRef }

function handleMaterialMatched(payload: {
  materialInventory: MaterialMatchedPayload["materialInventory"]
  matchedRows: unknown[]
}) {
  inputs.onMaterialMatched({
    success: true,
    materialInventory: payload.materialInventory,
    matchedRows: payload.matchedRows as MaterialMatchedPayload["matchedRows"],
  })
}
</script>

<template>
  <PanasonicRollShortageModal
    :show="showRollShortageModal"
    :form-value="rollShortageFormValue"
    :rules="rollShortageRules"
    :roll-type-options="rollTypeOptions"
    :form-ref="rollShortageBindings.formRef"
    @update:show="onRollShortageModalUpdate"
    @cancel="closeRollShortage"
    @submit="onSubmitShortage"
  />

  <MaterialQueryModal v-model:show="showMaterialQueryModal" :uuid="productionUuid" @error="showError" />

  <PanasonicMounterLayout>
    <template #header>
      <n-page-header @back="onClickBackArrow" class="page-header">
        <template #title>
          <div class="page-title">
            <span>{{ mounterIdno }}</span>
            <n-tag :type="isTestingMode ? 'warning' : 'success'" size="small" bordered>
              {{ isTestingMode ? PANASONIC_MODE_NAME_TESTING : PANASONIC_MODE_NAME_NORMAL }}
            </n-tag>
          </div>
        </template>
        <template #default>
          <div class="page-toolbar">
            <PanasonicMounterInfoBar
              :work-order="workOrderIdno"
              :product="productIdno"
              :board-side="workSheetSideQuery"
              :machine-side="machineSideQuery"
            />

            <n-space size="small">
              <StartProductionButton
                ref="startProductionBtnRef"
                v-if="!productionStarted"
                :is-testing-mode="isTestingMode"
                :row-data="rowData"
                :operator_id="currentUsername"
                :work-order-idno="workOrderIdno"
                :product-idno="productIdno"
                :mounter-idno="mounterIdno"
                :machine-side-query="machineSideQuery"
                :work-sheet-side-query="workSheetSideQuery"
                @started="handleProductionStarted"
                @error="showError"
              />
              <n-button v-else type="error" size="small" @click="onStopProduction">
                🛑 結束生產
              </n-button>
              <n-button type="warning" size="small" @click="onRollShortage" :disabled="!productionStarted">
                ⚠️ 單捲不足
              </n-button>
              <n-button type="info" size="small" @click="onMaterialQuery" :disabled="!productionStarted">
                🔍 接料查詢
              </n-button>
            </n-space>
          </div>
        </template>
      </n-page-header>
    </template>

    <template #inputs>
      <n-gi>
        <MaterialInventoryBarcodeInput
          :is-testing-mode="isTestingMode"
          ref="materialInventoryInput"
          :get-material-matched-rows="getMaterialMatchedRows"
          @matched="handleMaterialMatched"
          :reset-key="inputs.resetKey.value"
          @error="showError"
        />
      </n-gi>

      <n-gi>
        <SlotIdnoInput
          :is-testing-mode="isTestingMode"
          :has-material="inputs.hasMaterial.value"
          :parse-slot-idno="parsePanasonicSlotIdno"
          :reset-key="inputs.slotResetKey.value"
          ref="slotIdnoInput"
          :key="inputs.slotResetKey.value"
          @submit="handleSlotSubmitWithPolicy"
          @error="showError"
        />
      </n-gi>
    </template>

    <ag-grid-vue
      class="ag-theme-balham-dark grid-content"
      :rowData="rowData"
      :gridOptions="gridOptions"
      @grid-ready="onGridReady"
    />
  </PanasonicMounterLayout>
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

.grid-content {
  height: 100%;
}
</style>

<style>
body {
  /* This does not work. */
  margin-block-end: env(keyboard-inset-height, 5000px);
}
</style>
