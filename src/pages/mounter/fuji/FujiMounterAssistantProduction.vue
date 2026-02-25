<script setup lang="ts">
import "ag-grid-community/styles/ag-grid.css"
import "ag-grid-community/styles/ag-theme-balham.css"
import { AgGridVue } from "ag-grid-vue3"
import { NButton, NForm, NFormItem, NGi, NInput, NTag } from "naive-ui"
import { computed, nextTick, ref, watch } from "vue"
import { useMeta } from "vue-meta"

import MaterialQueryModal from "@/pages/mounter/fuji/components/MaterialQueryModal.vue"
import FujiMounterLayout from "@/pages/components/fuji/FujiMounterLayout.vue"
import FujiMounterHeader from "@/pages/components/fuji/FujiMounterHeader.vue"
import { useFujiProductionPage } from "@/ui/workflows/post-production/fuji/composables/useFujiProductionPage"
import { createFujiProductionGridOptions } from "@/ui/workflows/post-production/fuji/createFujiProductionGridOptions"

useMeta({ title: "Fuji Mounter Production" })

const {
  MODE_NAME_TESTING,
  MODE_NAME_NORMAL,
  MATERIAL_UNLOAD_TRIGGER,
  MATERIAL_UNLOAD_MODE_NAME,
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
  isUnloadMode,
  unloadMaterialValue,
  unloadSlotValue,
  showMaterialQueryModal,
  onGridReady,
  onClickBackArrow,
  onSubmitMaterialInventoryForm,
  onSubmitSlotForm,
  submitUnload,
  exitUnloadMode,
  onStopProduction,
  onMaterialQuery,
  showError,
} = useFujiProductionPage()

const unloadMaterialInputRef = ref<HTMLInputElement | null>(null)
const unloadSlotInputRef = ref<HTMLInputElement | null>(null)

const gridOptions = createFujiProductionGridOptions()
const currentModeName = computed(() => {
  if (isUnloadMode.value) {
    return MATERIAL_UNLOAD_MODE_NAME
  }

  return isTestingMode.value ? MODE_NAME_TESTING : MODE_NAME_NORMAL
})
const currentModeType = computed<"info" | "warning" | "success">(() => {
  if (isUnloadMode.value) return "info"
  return isTestingMode.value ? "warning" : "success"
})
const hasUnloadMaterial = computed(
  () => unloadMaterialValue.value.trim().length > 0
)

function focusUnloadMaterialInput() {
  nextTick(() => {
    unloadMaterialInputRef.value?.focus()
  })
}

watch(
  () => isUnloadMode.value,
  (enabled) => {
    if (enabled) {
      focusUnloadMaterialInput()
    }
  }
)

function handleUnloadMaterialEnter() {
  const material = unloadMaterialValue.value.trim()
  unloadMaterialValue.value = material

  if (!material) return

  if (material.toUpperCase() === MATERIAL_UNLOAD_TRIGGER) {
    exitUnloadMode()
    return
  }

  unloadSlotInputRef.value?.focus()
}

async function handleUnloadSlotSubmit() {
  const material = unloadMaterialValue.value.trim()
  const slot = unloadSlotValue.value.trim()

  if (!material) {
    showError("請先輸入物料條碼")
    return
  }

  if (!slot) {
    showError("請輸入槽位")
    return
  }

  const success = await submitUnload({
    materialPackCode: material,
    slotIdno: slot,
  })
  if (!success) return

  unloadMaterialValue.value = ""
  unloadSlotValue.value = ""
  focusUnloadMaterialInput()
}
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
          <n-tag data-testid="fuji-mode-tag" :type="currentModeType" size="small" bordered>
            {{ currentModeName }}
          </n-tag>

          <template v-if="isUnloadMode">
            <n-button
              data-testid="fuji-exit-unload-mode-btn"
              type="error"
              size="small"
              @click="exitUnloadMode"
            >
              退出卸除模式
            </n-button>
          </template>
          <template v-else>
            <n-button v-if="productionStarted" type="error" size="small" @click="onStopProduction">
              🛑 結束生產
            </n-button>
            <n-tag v-else type="success" size="small">生產已結束</n-tag>
            <n-button type="info" size="small" @click="onMaterialQuery">🔍 接料查詢</n-button>
          </template>
        </template>
      </FujiMounterHeader>
    </template>

    <template #inputs>
      <template v-if="!isUnloadMode">
        <n-gi>
          <n-form size="large" :model="materialFormValue" @submit.prevent="onSubmitMaterialInventoryForm">
            <n-form-item label="物料條碼">
              <n-input
                data-testid="material-input"
                type="text"
                size="large"
                v-model:value.lazy="materialFormValue.materialInventoryIdno"
                autofocus
                ref="materialInputRef"
                :disabled="!productionStarted"
                placeholder="輸入物料條碼"
              />
            </n-form-item>
          </n-form>
        </n-gi>
        <n-gi>
          <n-form size="large" :model="slotFormValue" @submit.prevent="onSubmitSlotForm">
            <n-form-item label="槽位">
              <n-input
                type="text"
                size="large"
                v-model:value.lazy="slotFormValue.slotIdno"
                ref="slotInputRef"
                :disabled="!productionStarted"
                placeholder="輸入槽位"
              />
            </n-form-item>
          </n-form>
        </n-gi>
      </template>

      <template v-else>
        <n-gi>
          <div class="unload-mode-input">
            <label class="input-label" for="fuji-unload-material-input">物料條碼 (換料卸除模式)</label>
            <input
              id="fuji-unload-material-input"
              data-testid="fuji-unload-material-input"
              ref="unloadMaterialInputRef"
              v-model="unloadMaterialValue"
              type="text"
              class="material-input"
              placeholder="掃描物料條碼"
              @keydown.enter.prevent="handleUnloadMaterialEnter"
            />
          </div>
        </n-gi>

        <n-gi>
          <div class="unload-mode-input">
            <label class="input-label" for="fuji-unload-slot-input">槽位編號</label>
            <input
              id="fuji-unload-slot-input"
              data-testid="fuji-unload-slot-input"
              ref="unloadSlotInputRef"
              v-model="unloadSlotValue"
              type="text"
              class="slot-input"
              placeholder="輸入 Fuji 槽位 (例如 XP2B1-A-9)"
              :disabled="!hasUnloadMaterial"
              @keydown.enter.prevent="handleUnloadSlotSubmit"
            />
          </div>
        </n-gi>
      </template>
    </template>

    <ag-grid-vue
      v-if="!isUnloadMode"
      class="ag-theme-balham-dark"
      :rowData="rowData"
      style="height: 100%"
      :gridOptions="gridOptions"
      @grid-ready="onGridReady"
    />
    <div v-else class="unload-mode-placeholder" data-testid="fuji-unload-mode-panel">
      <div class="unload-mode-info">
        <p>目前在「換料卸除」模式</p>
        <p v-if="unloadMaterialValue">
          物料: <strong>{{ unloadMaterialValue }}</strong>
        </p>
        <p v-if="unloadSlotValue">
          槽位: <strong>{{ unloadSlotValue }}</strong>
        </p>
      </div>
    </div>
  </FujiMounterLayout>
</template>

<style scoped>
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
}

.unload-mode-info {
  text-align: center;
  padding: 40px 20px;
  background-color: #e6f7ff;
  border: 2px solid #1890ff;
  border-radius: 8px;
  max-width: 420px;
}
</style>
