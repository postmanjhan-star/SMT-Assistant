<script setup lang="ts">
/* eslint-disable no-restricted-imports -- [Phase-1 whitelist] tracked in REFACTORING_BASELINE.md, fix in Phase 3 */
import "ag-grid-community/styles/ag-grid.css"
import "ag-grid-community/styles/ag-theme-balham.css"
import { AgGridVue } from "ag-grid-vue3"
import type { ColumnApi, GridApi, GridReadyEvent } from "ag-grid-community"
import { NButton, NGi, NPageHeader, NSpace, NTag } from "naive-ui"
import { computed, nextTick, ref, onMounted } from "vue"
import { useRoute } from "vue-router"
import { storeToRefs } from "pinia"
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
import {
  usePostProductionFeedStore,
  type PostProductionMaterialResult,
} from "@/stores/postProductionFeedStore"
import { useSlotInputSelection } from "@/ui/shared/composables/useSlotInputSelection"
import { usePanasonicProductionPage } from "@/ui/workflows/post-production/panasonic/composables/usePanasonicProductionPage"
import { createPanasonicProductionGrid } from "@/ui/workflows/post-production/panasonic/PanasonicProductionGridAdapter"
import { usePanasonicInputReset } from "@/ui/shared/composables/panasonic/usePanasonicInputReset"
import {
  PANASONIC_MODE_NAME_NORMAL,
  PANASONIC_MODE_NAME_TESTING,
} from "@/ui/shared/composables/panasonic/usePanasonicConstants"
import type { InputComponentHandle, MaterialMatchedPayload } from "./types/production"
import { createMockScan, MOCK_SCAN_ENABLED } from "@/dev/createMockScan"
import { SmtService } from "@/client"
import { useScanLoginModal } from "@/ui/shared/composables/useScanLoginModal"
import { parsePanasonicSlotIdno } from "@/domain/slot/PanasonicSlotParser"
import { usePanasonicProductionOperationFlows } from "@/ui/shared/composables/panasonic/usePanasonicProductionOperationFlows"

useMeta({ title: "Panasonic Mounter Assistant" })

const route = useRoute()
const isMockMode = import.meta.env.DEV && (MOCK_SCAN_ENABLED || route.query.mock_scan === '1')
const mockScan = isMockMode ? createMockScan() : undefined

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

const { rowData: materialQueryRawData, load: loadMaterialQuery } = usePanasonicMaterialQueryState(productionUuid)
const materialQueryRows = computed(() => materialQueryRawData.value as MaterialQueryRowModel[])

const localGridApi = ref<GridApi | null>(null)
const localColumnApi = ref<ColumnApi | null>(null)

function onGridReadyWithIpqc(e: GridReadyEvent) {
  localGridApi.value = e.api
  localColumnApi.value = e.columnApi
  onGridReady(e)
}

const gridOptions = createPanasonicProductionGrid()
const rollShortageBindings = { formRef: rollShortageFormRef }

const productionModeName = computed(() =>
  isTestingMode.value ? PANASONIC_MODE_NAME_TESTING : PANASONIC_MODE_NAME_NORMAL
)

const productionModeType = computed<"warning" | "success">(() =>
  isTestingMode.value ? "warning" : "success"
)

function focusMaterialInventoryInput() {
  nextTick(() => {
    materialInventoryInput.value?.focus()
  })
}

function clearNormalScanState() {
  store.clearMaterialResult()
  inputs.bumpResetKeys()
  materialInventoryInput.value?.clear?.()
  slotIdnoInput.value?.clear?.()
}

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
} = useScanLoginModal()

onMounted(() => {
  autoOpenIfUnauthenticated()
})

// ── Unload / IPQC operation flows ───────────────────────────────────────────

const {
  isUnloadMode,
  isIpqcMode,
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
  unloadMaterialInput,
  unloadSlotInput,
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
  inspectionUpload: async ({ statId, slotIdno, subSlotIdno, materialPackCode, operatorIdno }) => {
    await SmtService.addPanasonicMounterItemStatRoll({
      requestBody: {
        stat_item_id: statId,
        operator_id: operatorIdno,
        operation_time: new Date().toISOString(),
        slot_idno: slotIdno,
        sub_slot_idno: subSlotIdno,
        material_pack_code: materialPackCode,
        operation_type: "FEED" as any,
        feed_material_pack_type: "INSPECTION_MATERIAL_PACK" as any,
        check_pack_code_match: "MATCHED_MATERIAL_PACK" as any,
        unfeed_reason: null,
      },
    })
  },
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
      <!-- 換料模式 inputs -->
      <template v-if="isUnloadMode">
        <n-gi>
          <div class="unload-mode-input">
            <label class="input-label" for="unload-material-input">{{ unloadMaterialLabel }}</label>
            <input
              id="unload-material-input"
              data-testid="unload-material-input"
              ref="unloadMaterialInput"
              v-model="unloadMaterialValue"
              class="material-input"
              type="text"
              :placeholder="unloadMaterialPlaceholder"
              :disabled="isUnloadMaterialInputDisabled"
              @keydown.enter.prevent="handleUnloadMaterialEnter"
            />
          </div>
        </n-gi>

        <n-gi>
          <div class="unload-mode-input">
            <label class="input-label" for="unload-slot-input">{{ unloadSlotLabel }}</label>
            <input
              id="unload-slot-input"
              data-testid="unload-slot-input"
              ref="unloadSlotInput"
              v-model="unloadSlotValue"
              class="slot-input"
              type="text"
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
            <label class="input-label" for="prod-ipqc-material-input">
              覆檢物料條碼
            </label>
            <input
              id="prod-ipqc-material-input"
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
            <label class="input-label" for="prod-ipqc-slot-input">
              覆檢站位
            </label>
            <input
              id="prod-ipqc-slot-input"
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

        <n-gi>
          <SlotIdnoInput
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
  transition: border-color 0.3s;
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
  margin-block-end: env(keyboard-inset-height, 5000px);
}
</style>
