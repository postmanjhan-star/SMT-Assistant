<script setup lang="ts">
import "ag-grid-community/styles/ag-grid.css"
import "ag-grid-community/styles/ag-theme-balham.css"
import { AgGridVue } from "ag-grid-vue3"
import { NButton, NGi, NPageHeader, NSpace, NTag } from "naive-ui"
import { ref } from "vue"
import { storeToRefs } from "pinia"
import { useMeta } from "vue-meta"

import MaterialQueryModal from "./components/MaterialQueryModal.vue"
import StopProductionButton from "./components/StopProductionButton.vue"
import MaterialInventoryBarcodeInput from "@/pages/components/MaterialInventoryBarcodeInput.vue"
import SlotIdnoInput from "@/pages/components/SlotIdnoInput.vue"
import PanasonicRollShortageModal from "@/pages/components/panasonic/PanasonicRollShortageModal.vue"
import PanasonicMounterLayout from "@/pages/components/panasonic/PanasonicMounterLayout.vue"
import PanasonicMounterInfoBar from "@/pages/components/panasonic/PanasonicMounterInfoBar.vue"
import {
  usePostProductionFeedStore,
  type PostProductionMaterialResult,
} from "@/stores/postProductionFeedStore"
import { useSlotInputSelection } from "@/ui/shared/composables/useSlotInputSelection"
import { usePanasonicProductionPage } from "@/ui/workflows/post-production/panasonic/composables/usePanasonicProductionPage"
import { createPanasonicProductionGrid } from "@/ui/workflows/post-production/panasonic/PanasonicProductionGridAdapter"
import { parsePanasonicSlotIdno } from "@/domain/slot/PanasonicSlotParser"
import { usePanasonicInputReset } from "@/ui/shared/composables/panasonic/usePanasonicInputReset"
import {
  PANASONIC_MODE_NAME_NORMAL,
  PANASONIC_MODE_NAME_TESTING,
} from "@/ui/shared/composables/panasonic/usePanasonicConstants"
import type {
  InputComponentHandle,
  MaterialMatchedPayload,
} from "./types/production"

useMeta({ title: "Panasonic Mounter Assistant" })

const slotIdnoInput = ref<InputComponentHandle | null>(null)
const materialInventoryInput = ref<InputComponentHandle | null>(null)

const store = usePostProductionFeedStore()
const { materialResult } = storeToRefs(store)

const inputs = useSlotInputSelection<PostProductionMaterialResult>({
  materialResult,
  focusSlotInput: () => slotIdnoInput.value?.focus(),
})

const { resetInputsAfterSlotSubmit } = usePanasonicInputReset({
  clearMaterialResult: () => store.clearMaterialResult(),
  bumpResetKeys: () => inputs.bumpResetKeys(),
  materialInputRef: materialInventoryInput,
  slotInputRef: slotIdnoInput,
})

const {
  productionUuid,
  isTestingMode,
  mounterIdno,
  rowData,
  productionStarted,
  workOrderIdno,
  productIdno,
  boardSide,
  machineSideLabel,
  onGridReady,
  onProduction,
  handleProductionStopped,
  handleSlotSubmit,
  rollShortageFormRef,
  rollShortageFormValue,
  showRollShortageModal,
  rollShortageRules,
  rollTypeOptions,
  onRollShortage,
  onSubmitShortage,
  closeRollShortage,
  getMaterialMatchedRowArray,
  showMaterialQueryModal,
  onMaterialQuery,
  onClickBackArrow,
  ui,
} = usePanasonicProductionPage({
  onResetInputs: resetInputsAfterSlotSubmit,
})

const gridOptions = createPanasonicProductionGrid()
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

function onRollShortageModalUpdate(value: boolean) {
  if (!value) closeRollShortage()
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

  <MaterialQueryModal
    v-model:show="showMaterialQueryModal"
    :uuid="productionUuid"
    @error="ui.error"
  />

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
              :board-side="boardSide ?? ''"
              :machine-side="machineSideLabel"
            />

            <n-space size="small">
              <n-button
                v-if="!productionStarted"
                type="success"
                size="small"
                @click="onProduction"
              >
                ▶️ 開始生產
              </n-button>
              <StopProductionButton
                v-else
                :uuid="productionUuid"
                @stopped="handleProductionStopped"
                @error="ui.error"
              />
              <n-button type="warning" size="small" @click="onRollShortage" :disabled="!productionStarted">
                ⚠️ 單捲不足
              </n-button>
              <n-button type="info" size="small" @click="onMaterialQuery">
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
          :disabled="!productionStarted"
          :is-testing-mode="isTestingMode"
          :get-material-matched-rows="getMaterialMatchedRowArray"
          @matched="handleMaterialMatched"
          :reset-key="inputs.resetKey.value"
          ref="materialInventoryInput"
          @error="ui.error"
        />
      </n-gi>

      <n-gi>
        <SlotIdnoInput
          :disabled="!productionStarted"
          :is-testing-mode="isTestingMode"
          :has-material="inputs.hasMaterial.value"
          :parse-slot-idno="parsePanasonicSlotIdno"
          :reset-key="inputs.slotResetKey.value"
          ref="slotIdnoInput"
          @submit="handleSlotSubmit"
          @error="ui.error"
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
