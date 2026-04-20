<script setup lang="ts">
import "ag-grid-community/styles/ag-grid.css"
import "ag-grid-community/styles/ag-theme-balham.css"
import { AgGridVue } from "ag-grid-vue3"
import { NButton, NGi, NPageHeader, NSpace, NTag } from "naive-ui"
import { computed, onMounted } from "vue"
import { useRoute } from "vue-router"
import { useMeta } from "vue-meta"

import MounterMaterialQueryModal, { type MaterialQueryRowModel } from "@/pages/components/shared/MounterMaterialQueryModal.vue"
import { usePanasonicMaterialQueryState } from "@/ui/workflows/post-production/panasonic/composables/usePanasonicMaterialQueryState"
import StopProductionButton from "./components/StopProductionButton.vue"
import MaterialInventoryBarcodeInput from "@/pages/components/MaterialInventoryBarcodeInput.vue"
import SlotIdnoInput from "@/pages/components/SlotIdnoInput.vue"
import PanasonicRollShortageModal from "@/pages/components/panasonic/PanasonicRollShortageModal.vue"
import MounterLayout from "@/pages/components/shared/MounterLayout.vue"
import ScanLoginModal from "@/pages/components/shared/ScanLoginModal.vue"
import MounterInfoBar from "@/pages/components/shared/MounterInfoBar.vue"
import { usePanasonicProductionPage } from "@/ui/workflows/post-production/panasonic/composables/usePanasonicProductionPage"
import { usePanasonicProductionPageSetup } from "@/ui/workflows/post-production/panasonic/composables/usePanasonicProductionPageSetup"
import { createPanasonicProductionGrid } from "@/ui/workflows/post-production/panasonic/PanasonicProductionGridAdapter"
import type { MaterialMatchedPayload } from "./types/production"
import { createMockScan, MOCK_SCAN_ENABLED } from "@/dev/createMockScan"
import { useScanLoginModal } from "@/ui/shared/composables/useScanLoginModal"
import { createDefaultScanLoginDeps } from "@/ui/di/shared/createScanLoginDeps"
import { createPostproductionPanasonicDeps } from "@/ui/di/panasonic/createPanasonicWorkflowDeps"
import { parsePanasonicSlotIdno } from "@/domain/slot/PanasonicSlotParser"
import { usePanasonicProductionOperationFlows } from "@/ui/shared/composables/panasonic/usePanasonicProductionOperationFlows"
import PanasonicProductionInputSection from "@/pages/mounter/panasonic/components/PanasonicProductionInputSection.vue"

useMeta({ title: "Panasonic Mounter Assistant" })

const route = useRoute()
const isMockMode = import.meta.env.DEV && (MOCK_SCAN_ENABLED || route.query.mock_scan === '1')
const mockScan = isMockMode ? createMockScan() : undefined
const panasonicDeps = createPostproductionPanasonicDeps()

const setup = usePanasonicProductionPageSetup()
const {
  slotIdnoInput,
  materialInventoryInput,
  inputs,
  resetInputsAfterSlotSubmit,
  localGridApi,
  localColumnApi,
  focusMaterialInventoryInput,
  clearNormalScanState,
} = setup

const {
  productionUuid,
  isTestingMode,
  mounterIdno,
  currentUsername,
  currentOperatorIdno,
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
  submitForceUnloadBySlot,
  findUniqueUnloadSlotByPackCode,
  validateUnloadMaterialPackCode,
  validateReplacementMaterialForSlot,
  submitReplace,
  submitSplice,
  fetchMaterialInventory,
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
  isMockMode,
})

const { rowData: materialQueryRawData, load: loadMaterialQuery } = usePanasonicMaterialQueryState(productionUuid)
const materialQueryRows = computed(() => materialQueryRawData.value as MaterialQueryRowModel[])

const onGridReadyWithIpqc = setup.makeGridReadyHandler(onGridReady)
const { productionModeName, productionModeType } = setup.makeProductionModeComputeds(isTestingMode)

const gridOptions = createPanasonicProductionGrid()
const rollShortageBindings = { formRef: rollShortageFormRef }

// ── Scan Login ──────────────────────────────────────────────────────────────

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
} = useScanLoginModal(createDefaultScanLoginDeps())

onMounted(() => {
  autoOpenIfUnauthenticated()
})

// ── Unload / IPQC operation flows ───────────────────────────────────────────

const {
  isUnloadMode,
  isIpqcMode,
  isSpliceMode,
  isSpliceIdlePhase,
  isSpliceNewPhase,
  isSpliceSlotPhase,
  spliceSlotIdno,
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
  spliceMaterialValue,
  spliceSlotValue,
  unloadMaterialInput,
  unloadSlotInput,
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
} = usePanasonicProductionOperationFlows({
  rowData,
  gridApi: localGridApi,
  columnApi: localColumnApi,
  currentUsername,
  isTestingMode,
  isMockMode,
  showError: ui.error,
  showSuccess: ui.success,
  handleUserSwitchTrigger,
  clearNormalScanState,
  focusMaterialInput: focusMaterialInventoryInput,
  submitUnload,
  submitForceUnloadBySlot,
  findUniqueUnloadSlotByPackCode,
  validateUnloadMaterialPackCode,
  validateReplacementMaterialForSlot,
  submitReplace,
  submitSplice,
  fetchMaterialInventory,
  inspectionUpload: panasonicDeps.inspectionUpload,
})

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

function handleMaterialScanError(msg: string) {
  ui.error(msg)
  clearNormalScanState()
  focusMaterialInventoryInput()
}

async function onNormalSlotSubmit(payload: {
  slotIdno: string
  slot: string
  subSlot: string
}) {
  try {
    return await handleSlotSubmit(payload)
  } finally {
    resetInputsAfterSlotSubmit()
  }
}

function onRollShortageModalUpdate(value: boolean) {
  if (!value) closeRollShortage()
}

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
            <n-tag data-testid="panasonic-mode-tag" :type="productionModeType" size="small" bordered>
              {{ productionModeName }}
            </n-tag>
            <n-tag data-testid="panasonic-operation-tag" type="info" size="small" bordered>
              {{ operationModeName }}
            </n-tag>
          </div>
        </template>

        <template #default>
          <div class="page-toolbar">
            <MounterInfoBar
              :work-order="workOrderIdno"
              :product="productIdno"
              :board-side="boardSide ?? ''"
              :machine-side="machineSideLabel"
              :operator-name="currentUsername"
              :operator-idno="currentOperatorIdno"
            />

            <n-space size="small">
              <template v-if="isUnloadMode">
                <n-button
                  data-testid="exit-unload-mode-btn"
                  type="error"
                  size="small"
                  @click="exitUnloadMode"
                >
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
                  :disabled="!productionStarted"
                  @click="onProduction"
                >
                  🚀 開始生產
                </n-button>
                <StopProductionButton
                  v-else
                  :uuid="productionUuid"
                  :stop-production="panasonicDeps.stopProduction"
                  @stopped="handleProductionStopped"
                  @error="ui.error"
                />
                <n-button type="warning" size="small" @click="onRollShortage" :disabled="!productionStarted">
                  ⚠️ 單捲不足
                </n-button>
                <n-button type="info" size="small" @click="onMaterialQuery">🔍 接料查詢</n-button>
              </template>
            </n-space>
          </div>
        </template>
      </n-page-header>
    </template>

    <template #inputs>
      <n-gi key="col-material">
        <PanasonicProductionInputSection
          v-if="isUnloadMode || isIpqcMode || isSpliceMode"
          column="material"
          :is-unload-mode="isUnloadMode"
          :is-ipqc-mode="isIpqcMode"
          :is-splice-mode="isSpliceMode"
          :production-started="productionStarted"
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
          :disabled="!productionStarted"
          :is-testing-mode="isTestingMode"
          input-test-id="panasonic-main-material-input"
          :get-material-matched-rows="getMaterialMatchedRowArray"
          @matched="handleMaterialMatched"
          :before-scan="handleBeforeMaterialScan"
          :reset-key="inputs.resetKey.value"
          :scan="mockScan"
          ref="materialInventoryInput"
          @error="handleMaterialScanError"
        />
      </n-gi>

      <n-gi key="col-slot">
        <PanasonicProductionInputSection
          v-if="isUnloadMode || isIpqcMode || isSpliceMode"
          column="slot"
          :is-unload-mode="isUnloadMode"
          :is-ipqc-mode="isIpqcMode"
          :is-splice-mode="isSpliceMode"
          :production-started="productionStarted"
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
          :disabled="!productionStarted"
          :is-testing-mode="isTestingMode"
          :has-material="inputs.hasMaterial.value"
          :parse-slot-idno="parsePanasonicSlotIdno"
          :reset-key="inputs.slotResetKey.value"
          input-test-id="panasonic-main-slot-input"
          ref="slotIdnoInput"
          :before-submit="handleBeforeSlotSubmit"
          @submit="onNormalSlotSubmit"
          @done="resetInputsAfterSlotSubmit"
          @error="ui.error"
        />
      </n-gi>
    </template>

    <ag-grid-vue
      class="ag-theme-balham-dark grid-content"
      :rowData="rowData"
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
  margin-block-end: env(keyboard-inset-height, 5000px);
}
</style>
