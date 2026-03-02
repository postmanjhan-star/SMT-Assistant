<script setup lang="ts">
import "ag-grid-community/styles/ag-grid.css"
import "ag-grid-community/styles/ag-theme-balham.css"
import { AgGridVue } from "ag-grid-vue3"
import { NButton, NGi, NPageHeader, NSpace, NTag } from "naive-ui"
import { computed, nextTick, ref } from "vue"
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

const MATERIAL_UNLOAD_TRIGGER = "S5555"
const MATERIAL_UNLOAD_MODE_NAME = "換料卸除"

const slotIdnoInput = ref<InputComponentHandle | null>(null)
const materialInventoryInput = ref<InputComponentHandle | null>(null)
const unloadMaterialInput = ref<HTMLInputElement | null>(null)
const unloadSlotInput = ref<HTMLInputElement | null>(null)

const isUnloadMode = ref(false)
const unloadMaterialValue = ref("")
const unloadSlotValue = ref("")

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
  submitUnload,
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
const hasUnloadMaterial = computed(
  () => unloadMaterialValue.value.trim().length > 0
)
const currentModeName = computed(() => {
  if (isUnloadMode.value) {
    return MATERIAL_UNLOAD_MODE_NAME
  }

  return isTestingMode.value
    ? PANASONIC_MODE_NAME_TESTING
    : PANASONIC_MODE_NAME_NORMAL
})
const currentModeType = computed<"info" | "warning" | "success">(() => {
  if (isUnloadMode.value) {
    return "info"
  }

  return isTestingMode.value ? "warning" : "success"
})

function focusMaterialInventoryInput() {
  nextTick(() => {
    materialInventoryInput.value?.focus()
  })
}

function focusUnloadMaterialInput() {
  nextTick(() => {
    unloadMaterialInput.value?.focus()
  })
}

function clearNormalScanState() {
  store.clearMaterialResult()
  inputs.bumpResetKeys()
  materialInventoryInput.value?.clear?.()
  slotIdnoInput.value?.clear?.()
}

function enterUnloadMode() {
  isUnloadMode.value = true
  unloadMaterialValue.value = ""
  unloadSlotValue.value = ""
  clearNormalScanState()
  focusUnloadMaterialInput()
}

function exitUnloadMode() {
  isUnloadMode.value = false
  unloadMaterialValue.value = ""
  unloadSlotValue.value = ""
  clearNormalScanState()
  focusMaterialInventoryInput()
}

async function handleBeforeMaterialScan(barcode: string) {
  if (barcode.trim().toUpperCase() !== MATERIAL_UNLOAD_TRIGGER) {
    return true
  }

  enterUnloadMode()
  return false
}

function handleUnloadMaterialEnter() {
  const material = unloadMaterialValue.value.trim()
  unloadMaterialValue.value = material

  if (!material) {
    return
  }

  if (material.toUpperCase() === MATERIAL_UNLOAD_TRIGGER) {
    exitUnloadMode()
    return
  }

  unloadSlotInput.value?.focus()
}

async function handleUnloadSlotSubmit() {
  if (!isUnloadMode.value) {
    return
  }

  const materialPackCode = unloadMaterialValue.value.trim()
  const slotIdno = unloadSlotValue.value.trim()

  if (!slotIdno) {
    ui.error("請輸入槽位")
    return
  }

  // Enter on slot should clear both inputs immediately.
  unloadMaterialValue.value = ""
  unloadSlotValue.value = ""
  focusUnloadMaterialInput()

  if (!materialPackCode) {
    ui.error("請先輸入物料條碼")
    return
  }

  const success = await submitUnload({
    materialPackCode,
    slotIdno,
  })

  if (!success) {
    return
  }
}

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

function onNormalSlotSubmit(payload: {
  slotIdno: string
  slot: string
  subSlot: string
}) {
  const pending = handleSlotSubmit(payload)
  resetInputsAfterSlotSubmit()
  return pending
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
            <n-tag
              data-testid="panasonic-mode-tag"
              :type="currentModeType"
              size="small"
              bordered
            >
              {{ currentModeName }}
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
              <template v-if="isUnloadMode">
                <n-button
                  data-testid="exit-unload-mode-btn"
                  type="error"
                  size="small"
                  @click="exitUnloadMode"
                >
                  退出卸除模式
                </n-button>
              </template>
              <template v-else>
                <n-button
                  v-if="!productionStarted"
                  type="success"
                  size="small"
                  :disabled="!productionStarted"
                  @click="onProduction"
                >
                  🚀 開始生產
                </n-button>
                <StopProductionButton
                  v-else
                  :uuid="productionUuid"
                  @stopped="handleProductionStopped"
                  @error="ui.error"
                />
                <n-button
                  type="warning"
                  size="small"
                  @click="onRollShortage"
                  :disabled="!productionStarted"
                >
                  ⚠️ 單捲不足
                </n-button>
                <n-button type="info" size="small" @click="onMaterialQuery">
                  🔍 接料查詢
                </n-button>
              </template>
            </n-space>
          </div>
        </template>
      </n-page-header>
    </template>

    <template #inputs>
      <template v-if="!isUnloadMode">
        <n-gi>
          <MaterialInventoryBarcodeInput
            :disabled="!productionStarted"
            :is-testing-mode="isTestingMode"
            input-test-id="panasonic-main-material-input"
            :get-material-matched-rows="getMaterialMatchedRowArray"
            @matched="handleMaterialMatched"
            :before-scan="handleBeforeMaterialScan"
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
            input-test-id="panasonic-main-slot-input"
            ref="slotIdnoInput"
            @submit="onNormalSlotSubmit"
            @done="resetInputsAfterSlotSubmit"
            @error="ui.error"
          />
        </n-gi>
      </template>

      <template v-else>
        <n-gi>
          <div class="unload-mode-input">
            <label class="input-label" for="unload-material-input">
              物料條碼 (換料卸除模式)
            </label>
            <input
              id="unload-material-input"
              data-testid="unload-material-input"
              ref="unloadMaterialInput"
              v-model="unloadMaterialValue"
              class="material-input"
              type="text"
              placeholder="掃描物料條碼"
              @keydown.enter.prevent="handleUnloadMaterialEnter"
            />
          </div>
        </n-gi>

        <n-gi>
          <div class="unload-mode-input">
            <label class="input-label" for="unload-slot-input">槽位編號</label>
            <input
              id="unload-slot-input"
              data-testid="unload-slot-input"
              ref="unloadSlotInput"
              v-model="unloadSlotValue"
              class="slot-input"
              type="text"
              placeholder="輸入槽位編號"
              :disabled="!hasUnloadMaterial"
              @keydown.enter.prevent="handleUnloadSlotSubmit"
            />
          </div>
        </n-gi>
      </template>
    </template>

    <ag-grid-vue
      v-if="!isUnloadMode"
      class="ag-theme-balham-dark grid-content"
      :rowData="rowData"
      :gridOptions="gridOptions"
      @grid-ready="onGridReady"
    />
    <div v-else class="unload-mode-placeholder" data-testid="unload-mode-panel">
      <div class="unload-mode-info">
        <p>目前在「換料卸除」模式</p>
        <p v-if="unloadMaterialValue" class="material-info">
          物料: <strong>{{ unloadMaterialValue }}</strong>
        </p>
        <p v-if="unloadSlotValue" class="slot-info">
          槽位: <strong>{{ unloadSlotValue }}</strong>
        </p>
      </div>
    </div>
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

.unload-mode-input {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background-color: #f5f5f5;
  border-radius: 4px;
  border: 2px solid #1890ff;
}

.input-label {
  font-size: 12px;
  font-weight: 600;
  color: #1890ff;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.material-input,
.slot-input {
  padding: 10px 12px;
  font-size: 14px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-family: monospace;
  transition: border-color 0.3s;
}

.material-input:focus,
.slot-input:focus {
  outline: none;
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.slot-input:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
  color: #bfbfbf;
}

.unload-mode-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  background-color: #fafafa;
  border-top: 1px solid #f0f0f0;
}

.unload-mode-info {
  text-align: center;
  padding: 40px 20px;
  background-color: #e6f7ff;
  border: 2px solid #1890ff;
  border-radius: 8px;
  max-width: 400px;
}
</style>

<style>
body {
  /* This does not work. */
  margin-block-end: env(keyboard-inset-height, 5000px);
}
</style>
