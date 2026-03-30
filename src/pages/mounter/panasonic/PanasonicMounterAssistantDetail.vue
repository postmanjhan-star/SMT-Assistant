<script setup lang="ts">
import "ag-grid-community/styles/ag-grid.css"
import "ag-grid-community/styles/ag-theme-balham.css"
import { AgGridVue } from "ag-grid-vue3"
import type { ColumnApi, GridApi, GridReadyEvent } from "ag-grid-community"
import { NButton, NGi, NPageHeader, NSpace, NTag } from "naive-ui"
import { computed, nextTick, onMounted, ref } from "vue"
import { useMeta } from "vue-meta"
import { useRoute } from "vue-router"

import MaterialInventoryBarcodeInput from "@/pages/components/MaterialInventoryBarcodeInput.vue"
import SlotIdnoInput from "@/pages/components/SlotIdnoInput.vue"
import StartProductionButton from "./components/StartProductionButton.vue"
import MounterMaterialQueryModal, { type MaterialQueryRowModel } from "@/pages/components/shared/MounterMaterialQueryModal.vue"
import { usePanasonicMaterialQueryState } from "@/ui/workflows/post-production/panasonic/composables/usePanasonicMaterialQueryState"
import PanasonicRollShortageModal from "@/pages/components/panasonic/PanasonicRollShortageModal.vue"
import MounterLayout from "@/pages/components/shared/MounterLayout.vue"
import ScanLoginModal from "@/pages/components/shared/ScanLoginModal.vue"
import MounterInfoBar from "@/pages/components/shared/MounterInfoBar.vue"

import type { InputComponentHandle, MaterialMatchedPayload, SlotInputResult } from "./types/production"
import { createProductionGridOptions } from "@/ui/workflows/preproduction/panasonic/createProductionGridOptions"
import { useSlotInputSelection } from "@/ui/shared/composables/useSlotInputSelection"
import { parsePanasonicSlotIdno } from "@/domain/slot/PanasonicSlotParser"
import { usePanasonicInputReset } from "@/ui/shared/composables/panasonic/usePanasonicInputReset"
import { usePanasonicDetailPage } from "@/ui/workflows/preproduction/panasonic/composables/usePanasonicDetailPage"
import { PANASONIC_MODE_NAME_NORMAL, PANASONIC_MODE_NAME_TESTING } from "@/ui/shared/composables/panasonic/usePanasonicConstants"
import { createMockScan, MOCK_SCAN_ENABLED } from "@/dev/createMockScan"
import { useScanLoginModal } from "@/ui/shared/composables/useScanLoginModal"
import type { IpqcInspectionRecord } from "@/domain/mounter/ipqcTypes"
import { usePanasonicDetailCache } from "@/ui/shared/composables/panasonic/usePanasonicDetailCache"
import { usePanasonicOperationFlows } from "@/ui/shared/composables/panasonic/usePanasonicOperationFlows"
import type { PanasonicUnloadRecord, PanasonicSpliceRecord } from "@/ui/shared/composables/panasonic/panasonicDetailTypes"

useMeta({ title: "Panasonic Mounter Assistant" })

const route = useRoute()
const isMockMode =
  import.meta.env.DEV && (MOCK_SCAN_ENABLED || route.query.mock_scan === "1")
const mockScan = isMockMode ? createMockScan() : undefined

type StartProductionButtonHandle = {
  submit: (rows?: unknown[]) => Promise<void> | void
}

const slotIdnoInput = ref<InputComponentHandle | null>(null)
const materialInventoryInput = ref<InputComponentHandle | null>(null)
const startProductionBtnRef = ref<StartProductionButtonHandle | null>(null)
const materialInputValue = ref("")
const slotInputValue = ref("")
const gridApi = ref<GridApi | null>(null)
const columnApi = ref<ColumnApi | null>(null)
const pendingGridSync = ref(false)

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
  currentOperatorIdno,
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
  fetchMaterialInventory,
  showError,
} = usePanasonicDetailPage({
  onResetInputs: resetInputsAfterSlotSubmit,
  getSlotInputResult: () => materialInventoryResult.value,
  autoUploadRows: (rows) => {
    startProductionBtnRef.value?.submit(rows)
  },
  isMockMode,
})

// ─── Scan Login ──────────────────────────────────────────────────────────────

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
} = useScanLoginModal()

onMounted(() => {
  autoOpenIfUnauthenticated()
})

const { rowData: materialQueryRawData, load: loadMaterialQuery } = usePanasonicMaterialQueryState(productionUuid)
const materialQueryRows = computed(() => materialQueryRawData.value as MaterialQueryRowModel[])

const gridOptions = createProductionGridOptions(rowData)
const rollShortageBindings = { formRef: rollShortageFormRef }

// ─── Pending Records ─────────────────────────────────────────────────────────

const pendingUnloadRecords = ref<PanasonicUnloadRecord[]>([])
const pendingSpliceRecords = ref<PanasonicSpliceRecord[]>([])
const pendingIpqcRecords = ref<IpqcInspectionRecord[]>([])

// ─── Shared Callbacks ────────────────────────────────────────────────────────

function focusMaterialInput() {
  nextTick(() => {
    materialInventoryInput.value?.focus?.()
  })
}

function clearNormalScanState() {
  materialInventoryResult.value = null
  inputs.bumpResetKeys()
  materialInventoryInput.value?.clear?.()
  slotIdnoInput.value?.clear?.()
}

function syncGridRows(rows: unknown[]) {
  if (!gridApi.value) {
    pendingGridSync.value = true
    return
  }
  gridApi.value.setRowData(rows as any)
}

// ─── Cache ───────────────────────────────────────────────────────────────────

const { persistNow } = usePanasonicDetailCache({
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

// ─── Operation Flows ─────────────────────────────────────────────────────────

const {
  isUnloadMode,
  isIpqcMode,
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
  ipqcMaterialInput,
  ipqcSlotInput,
  exitUnloadMode,
  exitIpqcMode,
  handleBeforeMaterialScan,
  handleBeforeSlotSubmit,
  handleUnloadMaterialEnter,
  handleUnloadSlotSubmit,
  handleIpqcMaterialSubmit,
  handleIpqcSlotSubmit,
  onUnloadUploaded,
  onIpqcUploaded,
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
  clearNormalScanState,
  focusMaterialInput,
  persistNow,
  pendingUnloadRecords,
  pendingSpliceRecords,
  pendingIpqcRecords,
})

// ─── Material + Slot Submit ───────────────────────────────────────────────────

function handleMaterialMatched(payload: {
  materialInventory: MaterialMatchedPayload["materialInventory"]
  matchedRows: unknown[]
}) {
  inputs.onMaterialMatched({
    success: true,
    materialInventory: payload.materialInventory,
    matchedRows: payload.matchedRows as MaterialMatchedPayload["matchedRows"],
  })
  persistNow()
}

async function onSlotSubmit(payload: {
  slotIdno: string
  slot: string
  subSlot: string
}) {
  const targetRow = findRowBySlotIdno(payload.slotIdno)
  const existingMaterial = String(targetRow?.materialInventoryIdno ?? "").trim()
  const newPackCode = materialInventoryResult.value?.materialInventory?.idno?.trim()

  if (targetRow && String(targetRow.appendedMaterialInventoryIdno ?? "").trim()) {
    showError(`站位 ${payload.slotIdno} 已有接料，請先卸除當前料捲`)
    resetInputsAfterSlotSubmit()
    return
  }

  if (targetRow && existingMaterial && newPackCode) {
    const isMatched = materialInventoryResult.value?.matchedRows?.some(
      (r) =>
        r.slotIdno === payload.slot &&
        (r.subSlotIdno ?? "") === (payload.subSlot ?? "")
    )
    let correctState: "MATCHED_MATERIAL_PACK" | "TESTING_MATERIAL_PACK"
    if (isMatched || (isMockMode && !isTestingMode)) {
      correctState = "MATCHED_MATERIAL_PACK"
    } else if (isTestingMode) {
      correctState = "TESTING_MATERIAL_PACK"
    } else {
      showError(`料號不符：無法對站位 ${payload.slotIdno} 進行接料`)
      resetInputsAfterSlotSubmit()
      return
    }

    targetRow.appendedMaterialInventoryIdno = newPackCode
    targetRow.operatorIdno = currentUsername.value || null
    targetRow.operationTime = new Date().toISOString()
    if (correctState === "TESTING_MATERIAL_PACK") targetRow.remark = "[測試模式接料]"
    updateRowInGrid(targetRow)

    pendingSpliceRecords.value = [
      ...pendingSpliceRecords.value,
      {
        slotIdno: targetRow.slotIdno,
        subSlotIdno: targetRow.subSlotIdno ?? null,
        materialPackCode: newPackCode,
        correctState,
        operationTime: new Date().toISOString(),
      },
    ]
    resetInputsAfterSlotSubmit()
    persistNow()
    return
  }

  try {
    const result = await handleSlotSubmitWithPolicy(payload)
    const updatedRow = findRowBySlotIdno(payload.slotIdno)
    if (updatedRow && newPackCode) {
      updatedRow.appendedMaterialInventoryIdno = newPackCode
      updateRowInGrid(updatedRow)
    }
    return result
  } finally {
    resetInputsAfterSlotSubmit()
    persistNow()
  }
}

async function onSubmitShortageWithPersist() {
  await onSubmitShortage()
  persistNow()
}

// ─── Grid ─────────────────────────────────────────────────────────────────────

function onGridReadyWithCache(e: GridReadyEvent) {
  gridApi.value = e.api
  columnApi.value = e.columnApi
  onGridReady(e)
  if (pendingGridSync.value) {
    pendingGridSync.value = false
    syncGridRows(rowData.value)
  }
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
              <template v-else>
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
                  :pending-unload-records="pendingUnloadRecords"
                  :pending-splice-records="pendingSpliceRecords"
                  :pending-ipqc-records="pendingIpqcRecords"
                  @started="handleProductionStarted"
                  @unload-uploaded="onUnloadUploaded"
                  @ipqc-uploaded="onIpqcUploaded"
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
              </template>
            </n-space>
          </div>
        </template>
      </n-page-header>
    </template>

    <template #inputs>
      <!-- 換料模式 inputs -->
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

      <!-- 一般掃描 inputs -->
      <template v-else>
        <n-gi>
          <MaterialInventoryBarcodeInput
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

        <n-gi>
          <SlotIdnoInput
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

.unload-mode-input {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background-color: #f5f5f5;
  border-radius: 4px;
  border: 2px solid #1890ff;
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
</style>

<style>
body {
  /* This does not work. */
  margin-block-end: env(keyboard-inset-height, 5000px);
}
</style>
