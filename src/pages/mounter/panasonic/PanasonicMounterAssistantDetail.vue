<script setup lang="ts">
import "ag-grid-community/styles/ag-grid.css"
import "ag-grid-community/styles/ag-theme-balham.css"
import { AgGridVue } from "ag-grid-vue3"
import { NButton, NGi, NPageHeader, NSpace, NTag } from "naive-ui"
import { computed, onMounted } from "vue"
import { useMeta } from "vue-meta"
import { useRoute } from "vue-router"

import MaterialInventoryBarcodeInput from "@/pages/components/MaterialInventoryBarcodeInput.vue"
import SlotIdnoInput from "@/pages/components/SlotIdnoInput.vue"
import MounterMaterialQueryModal, { type MaterialQueryRowModel } from "@/pages/components/shared/MounterMaterialQueryModal.vue"
import { usePanasonicMaterialQueryState } from "@/ui/workflows/post-production/panasonic/composables/usePanasonicMaterialQueryState"
import PanasonicRollShortageModal from "@/pages/components/panasonic/PanasonicRollShortageModal.vue"
import MounterLayout from "@/pages/components/shared/MounterLayout.vue"
import ScanLoginModal from "@/pages/components/shared/ScanLoginModal.vue"
import MounterInfoBar from "@/pages/components/shared/MounterInfoBar.vue"

import type { MaterialMatchedPayload } from "./types/production"
import { createProductionGridOptions } from "@/ui/workflows/preproduction/panasonic/createProductionGridOptions"
import { parsePanasonicSlotIdno } from "@/domain/slot/PanasonicSlotParser"
import { usePanasonicDetailPage } from "@/ui/workflows/preproduction/panasonic/composables/usePanasonicDetailPage"
import { usePanasonicDetailPageSetup } from "@/ui/workflows/preproduction/panasonic/composables/usePanasonicDetailPageSetup"
import { PANASONIC_MODE_NAME_NORMAL, PANASONIC_MODE_NAME_TESTING } from "@/ui/shared/composables/panasonic/usePanasonicConstants"
import { createMockScan, MOCK_SCAN_ENABLED } from "@/dev/createMockScan"
import { useScanLoginModal } from "@/ui/shared/composables/useScanLoginModal"
import { createDefaultScanLoginDeps } from "@/ui/di/shared/createScanLoginDeps"
import { usePanasonicDetailCache } from "@/ui/shared/composables/panasonic/usePanasonicDetailCache"
import { usePanasonicOperationFlows } from "@/ui/shared/composables/panasonic/usePanasonicOperationFlows"
import { usePanasonicDetailSlotSubmit } from "@/ui/shared/composables/panasonic/usePanasonicDetailSlotSubmit"
import PanasonicDetailInputSection from "@/pages/mounter/panasonic/components/PanasonicDetailInputSection.vue"

useMeta({ title: "Panasonic Mounter Assistant" })

const route = useRoute()
const isMockMode =
  import.meta.env.DEV && (MOCK_SCAN_ENABLED || route.query.mock_scan === "1")
const mockScan = isMockMode ? createMockScan() : undefined

const setup = usePanasonicDetailPageSetup()
const {
  slotIdnoInput,
  materialInventoryInput,
  materialInputValue,
  slotInputValue,
  gridApi,
  columnApi,
  materialInventoryResult,
  pendingUnloadRecords,
  pendingSpliceRecords,
  pendingIpqcRecords,
  splicePreviewCorrectStates,
  inputs,
  focusMaterialInput,
  syncGridRows,
} = setup

const {
  isTestingMode,
  workOrderIdno,
  productIdno,
  mounterIdno,
  machineSideQuery,
  workSheetSideQuery,
  currentUsername,
  currentOperatorIdno,
  rowData,
  productionStarted,
  productionUuid,
  productionLoading,
  showRollShortageModal,
  rollShortageFormRef,
  rollShortageFormValue,
  rollShortageRules,
  rollTypeOptions,
  showMaterialQueryModal,
  onGridReady,
  onClickBackArrow,
  onStopProduction,
  onProduction,
  onRollShortage,
  onSubmitShortage,
  closeRollShortage,
  onMaterialQuery,
  handleSlotSubmitWithPolicy,
  onRollShortageModalUpdate,
  getMaterialMatchedRows,
  fetchMaterialInventory,
  showError,
} = usePanasonicDetailPage({
  onResetInputs: () => resetInputsAfterSlotSubmit(),
  getSlotInputResult: () => materialInventoryResult.value,
  getPendingUnloadRecords: () => pendingUnloadRecords.value,
  onUnloadUploaded: (ok) => {
    if (ok) {
      pendingUnloadRecords.value = []
      persistNow()
    }
  },
  getPendingSpliceRecords: () => pendingSpliceRecords.value,
  getPendingIpqcRecords: () => pendingIpqcRecords.value,
  onIpqcUploaded: (ok) => {
    if (ok) {
      pendingIpqcRecords.value = []
      persistNow()
    }
  },
  isMockMode,
})

const {
  showLoginModal,
  loginInput,
  loginError,
  isLoginLoading,
  isLoginRequired,
  currentUsername: loginCurrentUsername,
  closeLoginModal,
  handleLoginSubmit,
  handleUserSwitchTrigger,
  autoOpenIfUnauthenticated,
} = useScanLoginModal(createDefaultScanLoginDeps())

onMounted(() => {
  autoOpenIfUnauthenticated()
})

const { rowData: materialQueryRawData, load: loadMaterialQuery } = usePanasonicMaterialQueryState(productionUuid)
const materialQueryRows = computed(() => materialQueryRawData.value as MaterialQueryRowModel[])

const gridOptions = createProductionGridOptions(rowData)
const rollShortageBindings = { formRef: rollShortageFormRef }

const { persistNow, suspendWrite, resumeWrite } = usePanasonicDetailCache({
  isTestingMode,
  workOrderIdno,
  productIdno,
  mounterIdno,
  machineSideQuery,
  workSheetSideQuery,
  rowData,
  materialInventoryResult,
  materialInputValue,
  slotInputValue,
  pendingUnloadRecords,
  pendingSpliceRecords,
  pendingIpqcRecords,
  productionStarted,
  onHydrateRows: syncGridRows,
})

const {
  isUnloadMode,
  isIpqcMode,
  isSpliceMode,
  isSpliceNewPhase,
  isSpliceSlotPhase,
  spliceSlotIdno,
  unloadModeType,
  operationModeName,
  unloadMaterialValue,
  unloadSlotValue,
  unloadMaterialLabel,
  unloadMaterialPlaceholder,
  isUnloadMaterialInputDisabled,
  unloadSlotLabel,
  unloadSlotPlaceholder,
  isUnloadSlotInputDisabled,
  unloadMaterialInput,
  unloadSlotInput,
  ipqcMaterialValue,
  ipqcSlotValue,
  spliceMaterialValue,
  spliceSlotValue,
  ipqcMaterialInput,
  ipqcSlotInput,
  spliceMaterialInput,
  spliceSlotInput,
  exitUnloadMode,
  exitIpqcMode,
  exitSpliceMode,
  handleBeforeMaterialScan,
  handleBeforeSlotSubmit,
  handleUnloadMaterialEnter,
  handleUnloadSlotSubmit,
  handleIpqcMaterialSubmit,
  handleIpqcSlotSubmit,
  handleSpliceMaterialEnter,
  handleSpliceSlotEnter,
  findRowBySlotIdno,
  updateRowInGrid,
} = usePanasonicOperationFlows({
  rowData,
  gridApi,
  columnApi,
  currentUsername,
  isTestingMode,
  isMockMode,
  fetchMaterialInventory,
  showError,
  handleUserSwitchTrigger,
  clearNormalScanState: () => clearNormalScanState(),
  focusMaterialInput,
  persistNow,
  pendingUnloadRecords,
  pendingSpliceRecords,
  pendingIpqcRecords,
})

const restoreSplicePreview = setup.makeRestoreSplicePreview(rowData, updateRowInGrid)
const clearNormalScanState = setup.makeClearNormalScanState(restoreSplicePreview)
const { resetInputsAfterSlotSubmit } = setup.makeInputReset(restoreSplicePreview)
const onGridReadyWithCache = setup.makeGridReadyHandler(onGridReady, rowData)
const {
  bindUnloadMaterialInput,
  bindUnloadSlotInput,
  bindIpqcMaterialInput,
  bindIpqcSlotInput,
  bindSpliceMaterialInput,
  bindSpliceSlotInput,
} = setup.makeInputBinders({
  unloadMaterialInput,
  unloadSlotInput,
  ipqcMaterialInput,
  ipqcSlotInput,
  spliceMaterialInput,
  spliceSlotInput,
})

const { handleMaterialMatched, onSlotSubmit } = usePanasonicDetailSlotSubmit({
  splicePreviewCorrectStates,
  rowData,
  isSpliceMode,
  isTestingMode,
  isMockMode,
  getMaterialInventoryResult: () => materialInventoryResult.value,
  getCurrentUsername: () => currentUsername.value || null,
  findRowBySlotIdno,
  updateRowInGrid,
  onMaterialMatchedBase: (payload) => {
    inputs.onMaterialMatched({
      success: true,
      materialInventory: payload.materialInventory,
      matchedRows: payload.matchedRows as MaterialMatchedPayload["matchedRows"],
    })
  },
  handleSlotSubmitWithPolicy,
  persistNow,
  suspendWrite,
  resumeWrite,
  resetInputsAfterSlotSubmit,
  showError,
  pendingSpliceRecords,
})

async function onSubmitShortageWithPersist() {
  await onSubmitShortage()
  persistNow()
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
    @submit="onSubmitShortageWithPersist"
  />

  <MounterMaterialQueryModal
    v-model:show="showMaterialQueryModal"
    :row-data="materialQueryRows"
    closable
    @load="loadMaterialQuery"
  />

  <MounterLayout grid-cols="2 s:2" sticky-top="0" bg-color="var(--table-color)">
    <template #header>
      <n-page-header @back="onClickBackArrow" class="page-header">
        <template #title>
          <div class="page-title">
            <span>{{ mounterIdno }}</span>
            <n-tag :type="isTestingMode ? 'warning' : 'success'" size="small" bordered>
              {{ isTestingMode ? PANASONIC_MODE_NAME_TESTING : PANASONIC_MODE_NAME_NORMAL }}
            </n-tag>
            <n-tag type="info" size="small" bordered>
              {{ operationModeName }}
            </n-tag>
          </div>
        </template>
        <template #default>
          <div class="page-toolbar">
            <MounterInfoBar
              :work-order="workOrderIdno"
              :product="productIdno"
              :board-side="workSheetSideQuery"
              :machine-side="machineSideQuery"
              :operator-name="currentUsername"
              :operator-idno="currentOperatorIdno"
            />

            <n-space size="small">
              <template v-if="isUnloadMode">
                <n-button type="error" size="small" @click="exitUnloadMode">
                  {{ unloadModeType === 'force_single_slot' ? '退出⏏️單站卸除' : '退出🔄換料卸除' }}
                </n-button>
              </template>
              <template v-else-if="isIpqcMode">
                <n-button type="warning" size="small" @click="exitIpqcMode">
                  退出🔍IPQC覆檢
                </n-button>
              </template>
              <template v-else-if="isSpliceMode">
                <n-button class="splice-exit-btn" size="small" @click="exitSpliceMode">
                  退出📥接料模式
                </n-button>
              </template>
              <template v-else>
                <n-button
                  v-if="!productionStarted"
                  type="success"
                  size="small"
                  :loading="productionLoading"
                  :disabled="productionLoading"
                  @click="onProduction"
                >
                  🚀 開始生產
                </n-button>
                <n-button v-else type="error" size="small" @click="onStopProduction">
                  🛑 結束生產
                </n-button>
                <n-button type="warning" size="small" @click="onRollShortage" :disabled="!productionStarted">
                  ⚠️ 單捲不足
                </n-button>
                <n-button type="info" size="small" @click="onMaterialQuery" :disabled="!productionStarted">
                  🔍 接料查詢
                </n-button>
              </template>
            </n-space>
          </div>
        </template>
      </n-page-header>
    </template>

    <template #inputs>
      <n-gi key="col-material">
        <PanasonicDetailInputSection
          v-if="isUnloadMode || isIpqcMode || isSpliceMode"
          column="material"
          :is-unload-mode="isUnloadMode"
          :is-ipqc-mode="isIpqcMode"
          :is-splice-mode="isSpliceMode"
          :unload-material-label="unloadMaterialLabel"
          :unload-material-placeholder="unloadMaterialPlaceholder"
          :is-unload-material-input-disabled="isUnloadMaterialInputDisabled"
          :is-splice-new-phase="isSpliceNewPhase"
          :is-splice-slot-phase="isSpliceSlotPhase"
          :splice-slot-idno="spliceSlotIdno"
          v-model:unload-material-value="unloadMaterialValue"
          v-model:ipqc-material-value="ipqcMaterialValue"
          v-model:splice-material-value="spliceMaterialValue"
          :bind-unload-material-input="bindUnloadMaterialInput"
          :bind-ipqc-material-input="bindIpqcMaterialInput"
          :bind-splice-material-input="bindSpliceMaterialInput"
          @unload-material-enter="handleUnloadMaterialEnter"
          @ipqc-material-submit="handleIpqcMaterialSubmit"
          @splice-material-enter="handleSpliceMaterialEnter"
        />
        <MaterialInventoryBarcodeInput
          v-else
          v-model="materialInputValue"
          :is-testing-mode="isTestingMode"
          input-test-id="panasonic-main-material-input"
          ref="materialInventoryInput"
          :get-material-matched-rows="getMaterialMatchedRows"
          :scan="mockScan"
          :before-scan="handleBeforeMaterialScan"
          @matched="handleMaterialMatched"
          :reset-key="inputs.resetKey.value"
          @error="showError"
        />
      </n-gi>

      <n-gi key="col-slot">
        <PanasonicDetailInputSection
          v-if="isUnloadMode || isIpqcMode || isSpliceMode"
          column="slot"
          :is-unload-mode="isUnloadMode"
          :is-ipqc-mode="isIpqcMode"
          :is-splice-mode="isSpliceMode"
          :unload-slot-label="unloadSlotLabel"
          :unload-slot-placeholder="unloadSlotPlaceholder"
          :is-unload-slot-input-disabled="isUnloadSlotInputDisabled"
          :is-splice-slot-phase="isSpliceSlotPhase"
          :splice-slot-idno="spliceSlotIdno"
          :ipqc-material-value="ipqcMaterialValue"
          v-model:unload-slot-value="unloadSlotValue"
          v-model:ipqc-slot-value="ipqcSlotValue"
          v-model:splice-slot-value="spliceSlotValue"
          :bind-unload-slot-input="bindUnloadSlotInput"
          :bind-ipqc-slot-input="bindIpqcSlotInput"
          :bind-splice-slot-input="bindSpliceSlotInput"
          @unload-slot-submit="handleUnloadSlotSubmit"
          @ipqc-slot-submit="handleIpqcSlotSubmit"
          @splice-slot-enter="handleSpliceSlotEnter"
        />
        <SlotIdnoInput
          v-else
          v-model="slotInputValue"
          :is-testing-mode="isTestingMode"
          :has-material="inputs.hasMaterial.value"
          :parse-slot-idno="parsePanasonicSlotIdno"
          :reset-key="inputs.slotResetKey.value"
          input-test-id="panasonic-main-slot-input"
          ref="slotIdnoInput"
          :key="inputs.slotResetKey.value"
          :before-submit="handleBeforeSlotSubmit"
          @submit="onSlotSubmit"
          @done="resetInputsAfterSlotSubmit"
          @error="showError"
        />
      </n-gi>
    </template>

    <ag-grid-vue
      class="ag-theme-balham-dark grid-content"
      :rowData="rowData"
      :gridOptions="gridOptions"
      @grid-ready="onGridReadyWithCache"
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

.splice-exit-btn {
  --n-color: #eb2f96;
  --n-color-hover: #f759ab;
  --n-color-pressed: #c21875;
  --n-color-focus: #f759ab;
  --n-border: 1px solid #eb2f96;
  --n-border-hover: 1px solid #f759ab;
  --n-border-pressed: 1px solid #c21875;
  --n-border-focus: 1px solid #f759ab;
  --n-text-color: #fff;
  --n-text-color-hover: #fff;
  --n-text-color-pressed: #fff;
  --n-text-color-focus: #fff;
}
</style>

<style>
body {
  /* This does not work. */
  margin-block-end: env(keyboard-inset-height, 5000px);
}
</style>
