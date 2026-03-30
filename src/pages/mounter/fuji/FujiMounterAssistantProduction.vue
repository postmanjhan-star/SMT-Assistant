<script setup lang="ts">
/* eslint-disable no-restricted-imports -- [Phase-1 whitelist] tracked in REFACTORING_BASELINE.md, fix in Phase 3 */
import "ag-grid-community/styles/ag-grid.css"
import "ag-grid-community/styles/ag-theme-balham.css"
import { AgGridVue } from "ag-grid-vue3"
import type { ColumnApi, GridApi, GridReadyEvent } from "ag-grid-community"
import { NButton, NGi, NTag } from "naive-ui"
import { nextTick, ref, onMounted } from "vue"
import { useRoute } from "vue-router"
import { useMeta } from "vue-meta"
import { createMockScan, MOCK_SCAN_ENABLED } from "@/dev/createMockScan"

import MaterialInventoryBarcodeInput from "@/pages/components/MaterialInventoryBarcodeInput.vue"
import SlotIdnoInput from "@/pages/components/SlotIdnoInput.vue"
import MounterMaterialQueryModal from "@/pages/components/shared/MounterMaterialQueryModal.vue"
import MounterLayout from "@/pages/components/shared/MounterLayout.vue"
import ScanLoginModal from "@/pages/components/shared/ScanLoginModal.vue"
import FujiMounterHeader from "@/pages/components/fuji/FujiMounterHeader.vue"
import { parseFujiSlotInput } from "@/domain/slot/FujiSlotParser"
import { useFujiProductionPage } from "@/ui/workflows/post-production/fuji/composables/useFujiProductionPage"
import { useFujiOperationFlows } from "@/ui/shared/composables/fuji/useFujiOperationFlows"
import { createFujiProductionGridOptions } from "@/ui/workflows/post-production/fuji/createFujiProductionGridOptions"
import { useScanLoginModal } from "@/ui/shared/composables/useScanLoginModal"
import { useAuthStore } from "@/stores/authStore"

useMeta({ title: "Fuji Mounter Production" })

const route = useRoute()
const isMockMode = import.meta.env.DEV && (MOCK_SCAN_ENABLED || route.query.mock_scan === '1')
const mockScan = isMockMode ? createMockScan() : null

const {
  workOrderIdno,
  productIdno,
  mounterIdno,
  boardSide,
  isTestingMode,
  currentUsername,
  currentOperatorIdno,
  productionStarted,
  rowData,
  slotFormValue,
  materialInputRef,
  slotInputRef,
  materialInventoryFromScan,
  getMaterialMatchedRows,
  showMaterialQueryModal,
  materialQueryRowData,
  fetchMaterialQueryLogs,
  onGridReady,
  onClickBackArrow,
  onSubmitSlotForm: onSubmitSlotFormRaw,
  submitUnload,
  submitForceUnloadBySlot,
  findUniqueUnloadSlotByPackCode,
  validateUnloadMaterialPackCode,
  validateReplacementMaterialForSlot,
  submitReplace,
  onStopProduction,
  onMaterialQuery,
  showError,
  mounterData,
  inspectionUpload,
  applyInspectionUpdate,
} = useFujiProductionPage()

const materialResetKey = ref(0)
const slotResetKey = ref(0)
const localGridApi = ref<GridApi | null>(null)
const localColumnApi = ref<ColumnApi | null>(null)

const gridOptions = createFujiProductionGridOptions()

// ─── Scan Login ──────────────────────────────────────────────────────────────

const authStore = useAuthStore()
const {
  showLoginModal,
  loginInput,
  loginError,
  isLoginLoading,
  isLoginRequired,
  currentUsername: loginCurrentUsername,
  openLoginModal,
  closeLoginModal,
  handleLoginSubmit,
  handleUserSwitchTrigger,
  autoOpenIfUnauthenticated,
} = useScanLoginModal()

const {
  isUnloadMode,
  isIpqcMode,
  isUnloadScanPhase,
  isForceUnloadSlotPhase,
  isReplaceMaterialPhase,
  isReplaceSlotPhase,
  unloadModeType,
  operationModeName,
  unloadMaterialLabel,
  unloadMaterialPlaceholder,
  isUnloadMaterialInputDisabled,
  isUnloadSlotInputDisabled,
  unloadSlotLabel,
  unloadSlotPlaceholder,
  unloadMaterialValue,
  unloadSlotValue,
  ipqcMaterialValue,
  ipqcSlotValue,
  unloadMaterialInput: unloadMaterialInputRef,
  unloadSlotInput: unloadSlotInputRef,
  ipqcMaterialInput,
  ipqcSlotInput,
  handleBeforeMaterialScan,
  handleBeforeSlotSubmit,
  handleUnloadMaterialEnter,
  handleUnloadSlotSubmit,
  handleIpqcMaterialSubmit,
  handleIpqcSlotSubmit,
  handleExitUnloadMode,
  exitIpqcMode,
} = useFujiOperationFlows({
  getGridApi: () => localGridApi.value,
  getColumnApi: () => localColumnApi.value,
  currentUsername: () => loginCurrentUsername.value,
  rowData,
  mounterData,
  isTestingMode,
  isMockMode,
  showError,
  handleUserSwitchTrigger,
  clearNormalScanState: () => {
    materialInventoryFromScan.value = null
    materialResetKey.value++
    slotResetKey.value++
  },
  focusMaterialInput: () => materialInputRef.value?.focus(),
  getUnloadMaterialInputRef: () => unloadMaterialInputRef.value,
  getUnloadSlotInputRef: () => unloadSlotInputRef.value,
  submitUnload,
  submitForceUnloadBySlot,
  findUniqueUnloadSlotByPackCode,
  validateUnloadMaterialPackCode,
  validateReplacementMaterialForSlot,
  submitReplace,
  inspectionUpload,
  applyInspectionUpdate,
})

onMounted(() => {
  autoOpenIfUnauthenticated()
})

// ─── Grid ready ───────────────────────────────────────────────────────────────

function onGridReadyWithIpqc(e: GridReadyEvent) {
  localGridApi.value = e.api
  localColumnApi.value = e.columnApi
  onGridReady(e)
}

function onMaterialMatched(payload: { materialInventory: any }) {
  materialInventoryFromScan.value = payload.materialInventory
  nextTick(() => slotInputRef.value?.focus())
}

function onMaterialError(errorMsg: string) {
  materialInventoryFromScan.value = null
  showError(errorMsg)
}

async function onNormalSlotSubmit(payload: { slotIdno: string; slot: string; subSlot: string }) {
  slotFormValue.value.slotIdno = payload.slotIdno
  await onSubmitSlotFormRaw()
  materialResetKey.value++
  slotResetKey.value++
}
</script>

<template>
  <MounterMaterialQueryModal
    v-model:show="showMaterialQueryModal"
    :row-data="materialQueryRowData"
    title="接料查詢 (Fuji)"
    @load="fetchMaterialQueryLogs"
  />

  <MounterLayout :sticky-inputs="false">
    <template #header>
      <FujiMounterHeader
        :mounter-idno="mounterIdno"
        :is-testing-mode="isTestingMode"
        :work-order-idno="workOrderIdno"
        :product-idno="productIdno"
        :board-side="boardSide ?? ''"
        :operator-name="currentUsername"
        :operator-idno="currentOperatorIdno"
        @back="onClickBackArrow"
      >
        <template #mode-extra>
          <n-tag data-testid="fuji-operation-tag" type="info" size="small" bordered>
            {{ operationModeName }}
          </n-tag>
        </template>
        <template #actions>
          <template v-if="isUnloadMode">
            <n-button
              data-testid="fuji-exit-unload-mode-btn"
              type="error"
              size="small"
              @click="handleExitUnloadMode"
            >
              {{ unloadModeType === 'force_single_slot' ? '退出⏏️單站卸除' : '退出🔄換料卸除' }}
            </n-button>
          </template>
          <template v-else-if="isIpqcMode">
            <n-button type="warning" size="small" @click="exitIpqcMode">
              退出🔍IPQC覆檢
            </n-button>
          </template>
          <template v-else>
            <n-button v-if="productionStarted" type="error" size="small" @click="onStopProduction">
              🛑 結束生產
            </n-button>
            <n-button v-else type="success" size="small" disabled>尚未開始生產</n-button>
            <n-button type="info" size="small" @click="onMaterialQuery">🔍 接料查詢</n-button>
          </template>
        </template>
      </FujiMounterHeader>
    </template>

    <template #inputs>
      <!-- Unload mode inputs -->
      <template v-if="isUnloadMode">
        <n-gi>
          <div class="unload-mode-input">
            <label class="input-label" for="fuji-unload-material-input">
              {{ unloadMaterialLabel }}
            </label>
            <input
              id="fuji-unload-material-input"
              data-testid="fuji-unload-material-input"
              ref="unloadMaterialInputRef"
              v-model="unloadMaterialValue"
              type="text"
              class="material-input"
              :placeholder="unloadMaterialPlaceholder"
              :disabled="isUnloadMaterialInputDisabled"
              @keydown.enter.prevent="handleUnloadMaterialEnter"
            />
          </div>
        </n-gi>

        <n-gi>
          <div class="unload-mode-input">
            <label class="input-label" for="fuji-unload-slot-input">{{ unloadSlotLabel }}</label>
            <input
              id="fuji-unload-slot-input"
              data-testid="fuji-unload-slot-input"
              ref="unloadSlotInputRef"
              v-model="unloadSlotValue"
              type="text"
              class="slot-input"
              :placeholder="unloadSlotPlaceholder"
              :disabled="isUnloadSlotInputDisabled"
              @keydown.enter.prevent="handleUnloadSlotSubmit"
            />
          </div>
        </n-gi>
      </template>

      <!-- IPQC 覆檢 inputs -->
      <template v-else-if="isIpqcMode">
        <n-gi>
          <div class="ipqc-mode-input">
            <label class="input-label" for="fuji-ipqc-material-input">
              覆檢物料條碼
            </label>
            <input
              id="fuji-ipqc-material-input"
              ref="ipqcMaterialInput"
              v-model="ipqcMaterialValue"
              type="text"
              class="material-input"
              placeholder="請掃描物料條碼"
              @keydown.enter.prevent="handleIpqcMaterialSubmit"
            />
          </div>
        </n-gi>
        <n-gi>
          <div class="ipqc-mode-input">
            <label class="input-label" for="fuji-ipqc-slot-input">
              覆檢站位
            </label>
            <input
              id="fuji-ipqc-slot-input"
              ref="ipqcSlotInput"
              v-model="ipqcSlotValue"
              type="text"
              class="slot-input"
              placeholder="請掃描站位"
              :disabled="!ipqcMaterialValue.trim()"
              @keydown.enter.prevent="handleIpqcSlotSubmit"
            />
          </div>
        </n-gi>
      </template>

      <!-- Normal scan inputs -->
      <template v-else>
        <n-gi>
          <MaterialInventoryBarcodeInput
            ref="materialInputRef"
            :disabled="!productionStarted"
            :is-testing-mode="isTestingMode"
            :get-material-matched-rows="getMaterialMatchedRows"
            :reset-key="materialResetKey"
            :allow-no-match-in-testing="true"
            :before-scan="handleBeforeMaterialScan"
            :scan="mockScan ?? undefined"
            input-test-id="fuji-production-material-input"
            @matched="onMaterialMatched"
            @error="onMaterialError"
          />
        </n-gi>
        <n-gi>
          <SlotIdnoInput
            ref="slotInputRef"
            :disabled="!productionStarted"
            :is-testing-mode="isTestingMode"
            :has-material="!!materialInventoryFromScan"
            :parse-slot-idno="parseFujiSlotInput"
            :reset-key="slotResetKey"
            :before-submit="handleBeforeSlotSubmit"
            input-test-id="fuji-production-slot-input"
            @submit="onNormalSlotSubmit"
            @error="showError"
          />
        </n-gi>
      </template>
    </template>

    <ag-grid-vue
      class="ag-theme-balham-dark"
      :rowData="rowData"
      style="height: 100%"
      :gridOptions="gridOptions"
      @grid-ready="onGridReadyWithIpqc"
    />
  </MounterLayout>

  <ScanLoginModal
    :show="showLoginModal"
    v-model:login-input="loginInput"
    :login-error="loginError"
    :is-login-loading="isLoginLoading"
    :is-login-required="isLoginRequired"
    :current-username="loginCurrentUsername"
    @close="closeLoginModal"
    @submit="handleLoginSubmit"
  />
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
  background-color: #ffffff;
  color: #333333;
  transition: border-color 0.3s;
  width: 100%;
  box-sizing: border-box;
}

.material-input:focus,
.slot-input:focus {
  outline: none;
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.slot-input:disabled,
.material-input:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
  color: #bfbfbf;
}

.ipqc-mode-input {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background-color: #fff7e6;
  border-radius: 4px;
  border: 2px solid #fa8c16;
}

.ipqc-mode-input .input-label {
  color: #fa8c16;
}
</style>
