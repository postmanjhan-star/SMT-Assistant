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
import FujiProductionInputSection from "@/pages/mounter/fuji/components/FujiProductionInputSection.vue"
import { useFujiProductionPage } from "@/ui/workflows/post-production/fuji/composables/useFujiProductionPage"
import { useFujiOperationFlows } from "@/ui/shared/composables/fuji/useFujiOperationFlows"
import { createFujiProductionGridOptions } from "@/ui/workflows/post-production/fuji/createFujiProductionGridOptions"
import { useScanLoginModal } from "@/ui/shared/composables/useScanLoginModal"
import { createDefaultScanLoginDeps } from "@/ui/di/shared/createScanLoginDeps"
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
  submitSplice,
  onStopProduction,
  onMaterialQuery,
  showError,
  showSuccess,
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
} = useScanLoginModal(createDefaultScanLoginDeps())

const {
  isUnloadMode,
  isIpqcMode,
  isSpliceMode,
  isSpliceIdlePhase,
  isSpliceNewPhase,
  isSpliceSlotPhase,
  spliceSlotIdno,
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
  spliceMaterialValue,
  spliceSlotValue,
  unloadMaterialInput: unloadMaterialInputRef,
  unloadSlotInput: unloadSlotInputRef,
  ipqcMaterialInput,
  ipqcSlotInput,
  spliceMaterialInput,
  spliceSlotInput,
  handleBeforeMaterialScan,
  handleBeforeSlotSubmit,
  handleUnloadMaterialEnter,
  handleUnloadSlotSubmit,
  handleIpqcMaterialSubmit,
  handleIpqcSlotSubmit,
  handleSpliceMaterialEnter,
  handleSpliceSlotEnter,
  handleExitUnloadMode,
  exitIpqcMode,
  exitSpliceMode,
} = useFujiOperationFlows({
  getGridApi: () => localGridApi.value,
  getColumnApi: () => localColumnApi.value,
  currentUsername: () => loginCurrentUsername.value,
  rowData,
  mounterData,
  isTestingMode,
  isMockMode,
  showError,
  showSuccess,
  handleUserSwitchTrigger,
  clearNormalScanState: () => {
    materialInventoryFromScan.value = null
    materialResetKey.value++
    slotResetKey.value++
  },
  focusMaterialInput: () => materialInputRef.value?.focus(),
  submitUnload,
  submitForceUnloadBySlot,
  findUniqueUnloadSlotByPackCode,
  validateUnloadMaterialPackCode,
  validateReplacementMaterialForSlot,
  submitReplace,
  submitSplice,
  inspectionUpload,
  applyInspectionUpdate,
})

onMounted(() => {
  autoOpenIfUnauthenticated()
})

// ─── Input ref binders (for FujiProductionInputSection) ──────────────────────

const bindUnloadMaterialInput = (el: any) => { unloadMaterialInputRef.value = el as HTMLInputElement | null }
const bindUnloadSlotInput     = (el: any) => { unloadSlotInputRef.value = el as HTMLInputElement | null }
const bindIpqcMaterialInput   = (el: any) => { ipqcMaterialInput.value = el as HTMLInputElement | null }
const bindIpqcSlotInput       = (el: any) => { ipqcSlotInput.value = el as HTMLInputElement | null }
const bindSpliceMaterialInput = (el: any) => { spliceMaterialInput.value = el as HTMLInputElement | null }
const bindSpliceSlotInput     = (el: any) => { spliceSlotInput.value = el as HTMLInputElement | null }

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
          <template v-else-if="isSpliceMode">
            <n-button class="splice-exit-btn" size="small" @click="exitSpliceMode">
              退出📥接料模式
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
      <n-gi key="col-material">
        <FujiProductionInputSection
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

      <n-gi key="col-slot">
        <FujiProductionInputSection
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
