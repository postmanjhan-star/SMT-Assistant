<script setup lang="ts">
import "ag-grid-community/styles/ag-grid.css"
import "ag-grid-community/styles/ag-theme-balham.css"
import { AgGridVue } from "ag-grid-vue3"
import type { ColumnApi, GridApi, GridReadyEvent } from "ag-grid-community"
import { NButton, NGi, NTag } from "naive-ui"
import { ref, computed, nextTick, onMounted } from "vue"
import { useMeta } from "vue-meta"
import { useRoute } from "vue-router"

import MaterialInventoryBarcodeInput from "@/pages/components/MaterialInventoryBarcodeInput.vue"
import SlotIdnoInput from "@/pages/components/SlotIdnoInput.vue"
import MounterLayout from "@/pages/components/shared/MounterLayout.vue"
import ScanLoginModal from "@/pages/components/shared/ScanLoginModal.vue"
import FujiMounterHeader from "@/pages/components/fuji/FujiMounterHeader.vue"
import { parseFujiSlotInput } from "@/domain/slot/FujiSlotParser"
import { useFujiDetailPage } from "@/ui/workflows/preproduction/fuji/composables/useFujiDetailPage"
import { createMockScan, MOCK_SCAN_ENABLED } from "@/dev/createMockScan"
import { useScanLoginModal } from "@/ui/shared/composables/useScanLoginModal"
import { createDefaultScanLoginDeps } from "@/ui/di/shared/createScanLoginDeps"
import { useAuthStore } from "@/stores/authStore"
import type { IpqcInspectionRecord } from "@/domain/mounter/ipqcTypes"
import { useFujiPreproductionOperationFlows } from "@/ui/shared/composables/fuji/useFujiPreproductionOperationFlows"
import { useFujiDetailCache } from "@/ui/shared/composables/fuji/useFujiDetailCache"
import type {
  FujiPreproductionUnloadRecord,
  FujiPreproductionSpliceRecord,
} from "@/ui/shared/composables/fuji/fujiPreproductionDetailTypes"
import { useFujiDetailSlotSubmit } from "@/ui/shared/composables/fuji/useFujiDetailSlotSubmit"
import FujiDetailInputSection from "@/pages/mounter/fuji/components/FujiDetailInputSection.vue"

useMeta({ title: "Fuji Mounter Assistant" })

const route = useRoute()
const isMockMode = import.meta.env.DEV && (MOCK_SCAN_ENABLED || route.query.mock_scan === "1")
const effectiveScan = isMockMode ? createMockScan() : undefined

const slotIdnoInput = ref<{ focus: () => void } | null>(null)
const materialInventoryInput = ref<{ focus?: () => void; clear?: () => void } | null>(null)
const materialInputValue = ref("")
const slotInputValue = ref("")
const gridApi = ref<GridApi | null>(null)
const columnApi = ref<ColumnApi | null>(null)
const pendingGridSync = ref(false)

const pendingUnloadRecords = ref<FujiPreproductionUnloadRecord[]>([])
const pendingSpliceRecords = ref<FujiPreproductionSpliceRecord[]>([])
const pendingIpqcRecords = ref<IpqcInspectionRecord[]>([])

const splicePreviewCorrectStates = ref(new Map<string, string | null>())

const {
  workOrderIdno,
  productIdno,
  boardSide,
  mounterIdno,
  isTestingMode,
  currentUsername,
  currentOperatorIdno,
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
  resetMaterialState,
  handleSlotSubmit,
  showError,
  fetchMaterialInventory,
} = useFujiDetailPage({
  focusSlotInput: () => slotIdnoInput.value?.focus(),
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
  autoOpenIfUnauthenticated,
  handleLoginSubmit,
  handleUserSwitchTrigger,
} = useScanLoginModal(createDefaultScanLoginDeps())

onMounted(() => {
  autoOpenIfUnauthenticated()
})

// ─── Local scan helpers (passed to composables) ───────────────────────────────

function focusMaterialInput() {
  nextTick(() => materialInventoryInput.value?.focus?.())
}

function clearNormalScanState() {
  if (splicePreviewCorrectStates.value.size > 0) {
    for (const row of rowData.value) {
      const rowKey = `${row.mounterIdno}-${row.stage}-${row.slot}`
      const saved = splicePreviewCorrectStates.value.get(rowKey)
      if (saved !== undefined) {
        row.correct = saved as any
        updateRowInGrid(row)
      }
    }
    splicePreviewCorrectStates.value = new Map()
  }
  materialInputValue.value = ""
  slotInputValue.value = ""
  resetMaterialState()
}

// ─── Cache composable ─────────────────────────────────────────────────────────

const testingProductIdno = computed(() => {
  const val = route.query.testing_product_idno
  return Array.isArray(val) ? String(val[0] ?? "") : String(val ?? "")
})

const { persistNow, suspendWrite, resumeWrite } = useFujiDetailCache({
  isTestingMode,
  workOrderIdno: workOrderIdno as any,
  productIdno: productIdno as any,
  mounterIdno: mounterIdno as any,
  boardSideQuery: boardSide as any,
  testingProductIdno,
  rowData,
  materialInventory,
  materialInputValue,
  slotInputValue,
  pendingUnloadRecords,
  pendingSpliceRecords,
  pendingIpqcRecords,
  productionStarted,
  onHydrateRows: (rows) => syncGridRows(rows),
})

// ─── Operation flows composable ───────────────────────────────────────────────

const {
  isUnloadMode, isIpqcMode, isSpliceMode,
  isSpliceIdlePhase, isSpliceNewPhase, isSpliceSlotPhase,
  spliceSlotIdno,
  unloadModeType,
  operationModeName,
  unloadMaterialLabel, unloadMaterialPlaceholder,
  isUnloadMaterialInputDisabled, isUnloadSlotInputDisabled,
  unloadSlotLabel, unloadSlotPlaceholder,
  unloadMaterialValue, unloadSlotValue,
  ipqcMaterialValue, ipqcSlotValue,
  spliceMaterialValue, spliceSlotValue,
  unloadMaterialInput, unloadSlotInput, ipqcMaterialInput, ipqcSlotInput,
  spliceMaterialInput, spliceSlotInput,
  exitUnloadMode, exitIpqcMode, exitSpliceMode,
  handleBeforeMaterialScan, handleBeforeSlotSubmit,
  handleUnloadMaterialEnter, handleUnloadSlotSubmit,
  handleIpqcMaterialSubmit, handleIpqcSlotSubmit,
  handleSpliceMaterialEnter, handleSpliceSlotEnter,
  findRowBySlotIdno, updateRowInGrid,
} = useFujiPreproductionOperationFlows({
  getGridApi: () => gridApi.value as any,
  getColumnApi: () => columnApi.value as any,
  rowData,
  mounterIdno: mounterIdno as any,
  currentUsername: currentUsername as any,
  isTestingMode,
  isMockMode,
  fetchMaterialInventory,
  showError,
  handleUserSwitchTrigger,
  clearNormalScanState,
  focusMaterialInput,
  persistNow: () => persistNow(),
  pendingUnloadRecords,
  pendingSpliceRecords,
  pendingIpqcRecords,
})

// ─── Input ref binders (for FujiDetailInputSection) ──────────────────────────

const bindUnloadMaterialInput = (el: Element | null) => { unloadMaterialInput.value = el as HTMLInputElement | null }
const bindUnloadSlotInput     = (el: Element | null) => { unloadSlotInput.value = el as HTMLInputElement | null }
const bindIpqcMaterialInput   = (el: Element | null) => { ipqcMaterialInput.value = el as HTMLInputElement | null }
const bindIpqcSlotInput       = (el: Element | null) => { ipqcSlotInput.value = el as HTMLInputElement | null }
const bindSpliceMaterialInput = (el: Element | null) => { spliceMaterialInput.value = el as HTMLInputElement | null }
const bindSpliceSlotInput     = (el: Element | null) => { spliceSlotInput.value = el as HTMLInputElement | null }

// ─── Grid helpers ─────────────────────────────────────────────────────────────

function syncGridRows(rows: unknown[]) {
  if (!gridApi.value) {
    pendingGridSync.value = true
    return
  }
  gridApi.value.setRowData(rows as any)
}

function onGridReadyWithCache(e: GridReadyEvent) {
  gridApi.value = e.api
  columnApi.value = e.columnApi
  onGridReady(e)
  if (pendingGridSync.value) {
    pendingGridSync.value = false
    syncGridRows(rowData.value)
  }
}

// ─── Slot submit composable ───────────────────────────────────────────────────

const { onMaterialMatched, onMaterialError, onSlotSubmit } = useFujiDetailSlotSubmit({
  splicePreviewCorrectStates,
  rowData,
  isSpliceMode,
  isTestingMode,
  isMockMode,
  getMaterialInventory: () => materialInventory.value,
  getCurrentUsername: () => currentUsername.value || null,
  findRowBySlotIdno,
  updateRowInGrid,
  handleMaterialMatched,
  handleMaterialError,
  handleSlotSubmit,
  persistNow,
  suspendWrite,
  resumeWrite,
  clearNormalScanState: () => clearNormalScanState(),
  focusMaterialInput,
  showError,
  pendingSpliceRecords,
})
</script>

<template>
  <MounterLayout>
    <template #header>
      <FujiMounterHeader
        :mounter-idno="mounterIdno"
        :is-testing-mode="isTestingMode"
        :work-order-idno="workOrderIdno"
        :product-idno="productIdno"
        :board-side="boardSide"
        :operator-name="currentUsername"
        :operator-idno="currentOperatorIdno"
        @back="onClickBackArrow"
      >
        <template #mode-extra>
          <n-tag type="info" size="small" bordered>{{ operationModeName }}</n-tag>
        </template>
        <template #actions>
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
            <n-button v-if="!productionStarted" type="success" size="small" @click="onProduction">
              🚀 開始生產
            </n-button>
            <n-button v-else type="error" size="small" @click="onStopProduction">
              🛑 結束生產
            </n-button>
          </template>
        </template>
      </FujiMounterHeader>
    </template>

    <template #inputs>
      <n-gi key="col-material">
        <FujiDetailInputSection
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
          ref="materialInventoryInput"
          v-model="materialInputValue"
          :disabled="productionStarted"
          :is-testing-mode="isTestingMode"
          :get-material-matched-rows="getMaterialMatchedRows"
          :reset-key="materialResetKey"
          :scan="effectiveScan ?? scanMaterial"
          :allow-no-match-in-testing="true"
          :before-scan="handleBeforeMaterialScan"
          input-test-id="fuji-detail-material-input"
          @matched="onMaterialMatched"
          @error="onMaterialError"
        />
      </n-gi>

      <n-gi key="col-slot">
        <FujiDetailInputSection
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
          ref="slotIdnoInput"
          v-model="slotInputValue"
          :disabled="productionStarted"
          :is-testing-mode="isTestingMode"
          :has-material="!!materialInventory"
          :parse-slot-idno="parseFujiSlotInput"
          input-test-id="fuji-detail-slot-input"
          @submit="onSlotSubmit"
          @error="showError"
        />
      </n-gi>
    </template>

    <ag-grid-vue
      class="ag-theme-balham-dark"
      :rowData="rowData"
      style="height: 100%"
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
.ag-cell-wrapper {
  height: 100%;
}
</style>
