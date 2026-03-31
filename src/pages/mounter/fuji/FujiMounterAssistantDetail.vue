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
import { parseFujiSlotIdno, parseFujiSlotInput } from "@/domain/slot/FujiSlotParser"
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
  materialInputValue.value = ""
  slotInputValue.value = ""
  resetMaterialState()
}

// ─── Cache composable ─────────────────────────────────────────────────────────

const testingProductIdno = computed(() => {
  const val = route.query.testing_product_idno
  return Array.isArray(val) ? String(val[0] ?? "") : String(val ?? "")
})

const { persistNow } = useFujiDetailCache({
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
  isUnloadMode, isIpqcMode, unloadModeType,
  operationModeName,
  unloadMaterialLabel, unloadMaterialPlaceholder,
  isUnloadMaterialInputDisabled, isUnloadSlotInputDisabled,
  unloadSlotLabel, unloadSlotPlaceholder,
  unloadMaterialValue, unloadSlotValue,
  ipqcMaterialValue, ipqcSlotValue,
  unloadMaterialInput, unloadSlotInput, ipqcMaterialInput, ipqcSlotInput,
  exitUnloadMode, exitIpqcMode,
  handleBeforeMaterialScan,
  handleUnloadMaterialEnter, handleUnloadSlotSubmit,
  handleIpqcMaterialSubmit, handleIpqcSlotSubmit,
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

// ─── Normal scan handlers ─────────────────────────────────────────────────────

function onMaterialMatched(payload: Parameters<typeof handleMaterialMatched>[0]) {
  handleMaterialMatched(payload)
  persistNow()
}

function onMaterialError(message: string) {
  handleMaterialError(message)
  persistNow()
}

async function onSlotSubmit(payload: Parameters<typeof handleSlotSubmit>[0]) {
  const targetRow = findRowBySlotIdno(payload.slotIdno)
  const existingMaterial = String(targetRow?.materialInventoryIdno ?? "").trim()
  const currentMaterial = materialInventory.value
  const newPackCode = currentMaterial?.idno?.trim()

  if (targetRow && String(targetRow.appendedMaterialInventoryIdno ?? "").trim()) {
    showError(`站位 ${payload.slotIdno} 已有接料，請先卸除當前料捲`)
    clearNormalScanState()
    return
  }

  if (targetRow && existingMaterial && newPackCode) {
    const scannedMaterialId = String(currentMaterial?.material_idno ?? "").trim()
    const expectedMaterialId = String(targetRow.materialIdno ?? "").trim()

    let correctState: "MATCHED_MATERIAL_PACK" | "TESTING_MATERIAL_PACK"
    if ((scannedMaterialId && scannedMaterialId === expectedMaterialId) || (isMockMode && !isTestingMode.value)) {
      correctState = "MATCHED_MATERIAL_PACK"
    } else if (isTestingMode.value) {
      correctState = "TESTING_MATERIAL_PACK"
    } else {
      showError(`料號不符：無法對站位 ${payload.slotIdno} 進行接料`)
      clearNormalScanState()
      return
    }

    const parsed = parseFujiSlotIdno(payload.slotIdno)
    if (!parsed) {
      showError(`無法解析站位 ${payload.slotIdno}`)
      return
    }

    targetRow.appendedMaterialInventoryIdno = newPackCode
    targetRow.operatorIdno = currentUsername.value || null
    targetRow.operationTime = new Date().toISOString()
    updateRowInGrid(targetRow)

    pendingSpliceRecords.value = [
      ...pendingSpliceRecords.value,
      {
        slot: parsed.slot,
        stage: parsed.stage,
        materialPackCode: newPackCode,
        correctState,
        operationTime: new Date().toISOString(),
      },
    ]
    clearNormalScanState()
    focusMaterialInput()
    persistNow()
    return
  }

  const result = await handleSlotSubmit(payload)
  const updatedRow = findRowBySlotIdno(payload.slotIdno)
  if (updatedRow && newPackCode) {
    updatedRow.appendedMaterialInventoryIdno = newPackCode
    updateRowInGrid(updatedRow)
  }
  persistNow()
  return result
}
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
      <!-- Unload mode inputs -->
      <template v-if="isUnloadMode">
        <n-gi>
          <div class="unload-mode-input">
            <label class="input-label" for="detail-unload-material-input">
              {{ unloadMaterialLabel }}
            </label>
            <input
              id="detail-unload-material-input"
              ref="unloadMaterialInput"
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
            <label class="input-label" for="detail-unload-slot-input">
              {{ unloadSlotLabel }}
            </label>
            <input
              id="detail-unload-slot-input"
              ref="unloadSlotInput"
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
            <label class="input-label" for="detail-ipqc-material-input">
              覆檢物料條碼
            </label>
            <input
              id="detail-ipqc-material-input"
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
            <label class="input-label" for="detail-ipqc-slot-input">
              覆檢站位
            </label>
            <input
              id="detail-ipqc-slot-input"
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

        <n-gi>
          <SlotIdnoInput
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

<style>
.ag-cell-wrapper {
  height: 100%;
}
</style>
