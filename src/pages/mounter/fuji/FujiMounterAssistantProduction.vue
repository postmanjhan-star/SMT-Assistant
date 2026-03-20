<script setup lang="ts">
import "ag-grid-community/styles/ag-grid.css"
import "ag-grid-community/styles/ag-theme-balham.css"
import { AgGridVue } from "ag-grid-vue3"
import type { ColumnApi, GridApi, GridReadyEvent } from "ag-grid-community"
import { NButton, NGi, NTag } from "naive-ui"
import { nextTick, ref, watch } from "vue"
import { useRoute } from "vue-router"
import { useMeta } from "vue-meta"
import { createMockScan, MOCK_SCAN_ENABLED } from "@/dev/createMockScan"
import { resolveMaterialLookupError } from "@/domain/material/MaterialLookupError"
import { CheckMaterialMatchEnum, SmtService } from "@/client"
import { isFujiStatSlotMatch } from "@/domain/production/buildFujiProductionRowData"

import MaterialInventoryBarcodeInput from "@/pages/components/MaterialInventoryBarcodeInput.vue"
import SlotIdnoInput from "@/pages/components/SlotIdnoInput.vue"
import MounterMaterialQueryModal from "@/pages/components/shared/MounterMaterialQueryModal.vue"
import MounterLayout from "@/pages/components/shared/MounterLayout.vue"
import FujiMounterHeader from "@/pages/components/fuji/FujiMounterHeader.vue"
import { parseFujiSlotIdno, parseFujiSlotInput } from "@/domain/slot/FujiSlotParser"
import { useFujiProductionPage } from "@/ui/workflows/post-production/fuji/composables/useFujiProductionPage"
import { useUnloadModeController } from "@/ui/shared/composables/useUnloadModeController"
import { createFujiProductionGridOptions } from "@/ui/workflows/post-production/fuji/createFujiProductionGridOptions"
import {
  MATERIAL_UNLOAD_TRIGGER,
  MATERIAL_FORCE_UNLOAD_TRIGGER,
  MATERIAL_EXIT_TRIGGER,
  MATERIAL_IPQC_TRIGGER,
} from "@/domain/mounter/operationModes"

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
  productionStarted,
  rowData,
  slotFormValue,
  materialInputRef,
  slotInputRef,
  materialInventoryFromScan,
  getMaterialMatchedRows,
  isUnloadMode,
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
  enterUnloadMode,
  exitUnloadMode,
  onStopProduction,
  onMaterialQuery,
  showError,
  mounterData,
  inspectionUpload,
  applyInspectionUpdate,
} = useFujiProductionPage()

const materialResetKey = ref(0)
const slotResetKey = ref(0)
const unloadMaterialInputRef = ref<HTMLInputElement | null>(null)
const unloadSlotInputRef = ref<HTMLInputElement | null>(null)
const isIpqcMode = ref(false)
const ipqcMaterialValue = ref("")
const ipqcSlotValue = ref("")
const ipqcMaterialInput = ref<HTMLInputElement | null>(null)
const ipqcSlotInput = ref<HTMLInputElement | null>(null)
const ipqcSavedCorrectStates = ref<Map<string, unknown>>(new Map())
const localGridApi = ref<GridApi | null>(null)
const localColumnApi = ref<ColumnApi | null>(null)

const gridOptions = createFujiProductionGridOptions()

function toCanonicalFujiSlot(raw: string): string | null {
  const parsed = parseFujiSlotIdno(raw)
  if (!parsed) return null
  return `${parsed.machineIdno}-${parsed.stage}-${parsed.slot}`
}

const {
  unloadModeType,
  unloadReplacePhase,
  unloadMaterialValue,
  unloadSlotValue,
  resolvedUnloadSlotIdno,
  replacementMaterialPackCode,
  operationModeName,
  isUnloadScanPhase,
  isForceUnloadSlotPhase,
  isReplaceMaterialPhase,
  isReplaceSlotPhase,
  unloadMaterialLabel,
  unloadMaterialPlaceholder,
  isUnloadMaterialInputDisabled,
  isUnloadSlotInputDisabled,
  unloadSlotLabel,
  unloadSlotPlaceholder,
  resetUnloadFlowState,
  focusUnloadMaterialInput,
  focusUnloadSlotInput,
  focusByCurrentPhase,
  resetToInitialUnloadPhase,
} = useUnloadModeController({
  isUnloadMode,
  isIpqcMode,
  toCanonicalSlot: toCanonicalFujiSlot,
  getUnloadMaterialInputRef: () => unloadMaterialInputRef.value,
  getUnloadSlotInputRef: () => unloadSlotInputRef.value,
})

function handleExitUnloadMode() {
  resetUnloadFlowState("pack_auto_slot")
  exitUnloadMode()
}

// ─── IPQC helpers ──────────────────────────────────────────────────────────────

function onGridReadyWithIpqc(e: GridReadyEvent) {
  localGridApi.value = e.api
  localColumnApi.value = e.columnApi
  onGridReady(e)
}

function focusIpqcMaterialInput() {
  nextTick(() => ipqcMaterialInput.value?.focus())
}

function focusIpqcSlotInput() {
  nextTick(() => ipqcSlotInput.value?.focus())
}

function parseAppendedCodes(value: string | null | undefined): string[] {
  if (!value) return []
  return value.split(",").map((s) => s.trim()).filter(Boolean)
}

function getCurrentPackCode(row: any): string {
  const appended = parseAppendedCodes(row.appendedMaterialInventoryIdno)
  if (appended.length > 0) return appended[appended.length - 1]
  return String(row.materialInventoryIdno ?? "").trim()
}

function findRowBySlotIdno(slotIdno: string) {
  const parsed = parseFujiSlotIdno(slotIdno)
  if (!parsed) return null
  return (rowData.value ?? []).find(
    (row: any) =>
      Number(row.slot) === parsed.slot && String(row.stage).trim() === String(parsed.stage).trim()
  )
}

async function validateIpqcMaterialPackCode(materialPackCode: string): Promise<boolean> {
  const trimmed = materialPackCode.trim()
  if (!trimmed) {
    showError("請先輸入物料條碼")
    return false
  }
  if (isTestingMode.value || isMockMode) return true
  try {
    await SmtService.getMaterialInventoryForSmt({ materialInventoryIdno: trimmed })
    return true
  } catch (error) {
    showError(resolveMaterialLookupError(error))
    return false
  }
}

function enterIpqcMode() {
  isIpqcMode.value = true
  materialResetKey.value++
  slotResetKey.value++
  materialInventoryFromScan.value = null

  // 儲存目前 correct 狀態，全部設為 ⛔
  const saved = new Map<string, unknown>()
  for (const row of rowData.value) {
    const key = `${row.mounterIdno}-${row.stage}-${row.slot}`
    saved.set(key, row.correct)
    ;(row as any).correct = "UNLOADED_MATERIAL_PACK"
  }
  ipqcSavedCorrectStates.value = saved

  if (localGridApi.value) {
    localGridApi.value.setRowData(rowData.value as any)
  }

  focusIpqcMaterialInput()
}

function exitIpqcMode() {
  isIpqcMode.value = false
  // 恢復原本 correct 狀態
  for (const row of rowData.value) {
    const key = `${row.mounterIdno}-${row.stage}-${row.slot}`
    const saved = ipqcSavedCorrectStates.value.get(key)
    if (saved !== undefined) {
      ;(row as any).correct = saved
    }
  }
  ipqcSavedCorrectStates.value.clear()

  if (localGridApi.value) {
    localGridApi.value.setRowData(rowData.value as any)
  }

  ipqcMaterialValue.value = ""
  ipqcSlotValue.value = ""
  materialInputRef.value?.focus()
}

function toggleIpqcMode() {
  isIpqcMode.value ? exitIpqcMode() : enterIpqcMode()
}

async function handleIpqcMaterialSubmit() {
  const materialPackCode = ipqcMaterialValue.value.trim()
  if (!materialPackCode) return

  const code = materialPackCode.toUpperCase()
  if (code === MATERIAL_EXIT_TRIGGER || code === MATERIAL_IPQC_TRIGGER) {
    exitIpqcMode()
    ipqcMaterialValue.value = ""
    return
  }
  if (code === MATERIAL_UNLOAD_TRIGGER || code === MATERIAL_FORCE_UNLOAD_TRIGGER) {
    exitIpqcMode()
    ipqcMaterialValue.value = ""
    unloadModeType.value = code === MATERIAL_FORCE_UNLOAD_TRIGGER ? "force_single_slot" : "pack_auto_slot"
    enterUnloadMode()
    return
  }

  const isValid = await validateIpqcMaterialPackCode(materialPackCode)
  if (!isValid) {
    ipqcMaterialValue.value = ""
    focusIpqcMaterialInput()
    return
  }

  ipqcMaterialValue.value = materialPackCode
  focusIpqcSlotInput()
}

async function handleIpqcSlotSubmit() {
  const slotIdno = ipqcSlotValue.value.trim()
  if (!slotIdno) return

  const code = slotIdno.toUpperCase()
  if (code === MATERIAL_EXIT_TRIGGER || code === MATERIAL_IPQC_TRIGGER) {
    exitIpqcMode()
    ipqcSlotValue.value = ""
    return
  }

  const materialPackCode = ipqcMaterialValue.value.trim()
  const parsed = parseFujiSlotIdno(slotIdno)
  if (!parsed) {
    showError(`槽位格式錯誤: ${slotIdno}`)
    ipqcSlotValue.value = ""
    focusIpqcSlotInput()
    return
  }

  const row = findRowBySlotIdno(slotIdno)
  if (!row) {
    showError(`找不到槽位 ${slotIdno}`)
    ipqcSlotValue.value = ""
    focusIpqcSlotInput()
    return
  }

  // 比對掃描的捲號 vs 槽位目前的捲號
  const currentPackCode = getCurrentPackCode(row)
  if (materialPackCode !== currentPackCode) {
    showError(`料號不符：掃描 ${materialPackCode}，槽位應為 ${currentPackCode}`)
    ipqcSlotValue.value = ""
    ipqcMaterialValue.value = ""
    focusIpqcMaterialInput()
    return
  }

  // 即時上傳 IPQC 紀錄
  const statItem = mounterData.value.find((s) =>
    isFujiStatSlotMatch(s, parsed.slot, parsed.stage)
  )

  if (statItem) {
    try {
      await inspectionUpload({
        stat_id: statItem.id,
        inputSlot: String(parsed.slot),
        inputSubSlot: parsed.stage,
        materialInventory: { idno: materialPackCode } as any,
      })
      applyInspectionUpdate(parsed.machineIdno, parsed.stage, parsed.slot, materialPackCode)
    } catch (error) {
      showError("巡檢上傳失敗")
      console.error(error)
    }
  }

  // 標記已巡檢 ✅
  ;(row as any).correct = CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK
  if (localGridApi.value) {
    localGridApi.value.applyTransaction?.({ update: [row] })
  }

  ipqcSlotValue.value = ""
  ipqcMaterialValue.value = ""
  focusIpqcMaterialInput()
}

function handleModeTriggerFromUnloadInput(code: string) {
  if (code === MATERIAL_IPQC_TRIGGER) {
    handleExitUnloadMode()
    enterIpqcMode()
    return true
  }

  if (code === MATERIAL_EXIT_TRIGGER) {
    handleExitUnloadMode()
    return true
  }

  if (code === MATERIAL_UNLOAD_TRIGGER || code === MATERIAL_FORCE_UNLOAD_TRIGGER) {
    handleExitUnloadMode()
    return true
  }

  return false
}

watch(
  () => isUnloadMode.value,
  (enabled) => {
    if (enabled) {
      resetUnloadFlowState(unloadModeType.value)
      focusByCurrentPhase()
    }
  }
)

function handleBeforeMaterialScan(barcode: string): boolean {
  const code = barcode.trim().toUpperCase()
  if (code === MATERIAL_UNLOAD_TRIGGER) {
    unloadModeType.value = "pack_auto_slot"
    isIpqcMode.value = false
    enterUnloadMode()
    return false
  }
  if (code === MATERIAL_FORCE_UNLOAD_TRIGGER) {
    unloadModeType.value = "force_single_slot"
    isIpqcMode.value = false
    enterUnloadMode()
    return false
  }
  if (code === MATERIAL_IPQC_TRIGGER) {
    toggleIpqcMode()
    return false
  }
  if (code === MATERIAL_EXIT_TRIGGER && isIpqcMode.value) {
    exitIpqcMode()
    return false
  }
  return true
}

function onMaterialMatched(payload: { materialInventory: any }) {
  materialInventoryFromScan.value = payload.materialInventory
  nextTick(() => slotInputRef.value?.focus())
}

function onMaterialError(errorMsg: string) {
  materialInventoryFromScan.value = null
  showError(errorMsg)
}

async function handleBeforeSlotSubmit(raw: string): Promise<boolean> {
  const code = raw.trim().toUpperCase()
  if (code === MATERIAL_UNLOAD_TRIGGER) {
    unloadModeType.value = "pack_auto_slot"
    isIpqcMode.value = false
    enterUnloadMode()
    return false
  }
  if (code === MATERIAL_FORCE_UNLOAD_TRIGGER) {
    unloadModeType.value = "force_single_slot"
    isIpqcMode.value = false
    enterUnloadMode()
    return false
  }
  if (code === MATERIAL_IPQC_TRIGGER) {
    toggleIpqcMode()
    return false
  }
  if (code === MATERIAL_EXIT_TRIGGER && isIpqcMode.value) {
    exitIpqcMode()
    return false
  }
  return true
}

async function onNormalSlotSubmit(payload: { slotIdno: string; slot: string; subSlot: string }) {
  slotFormValue.value.slotIdno = payload.slotIdno
  await onSubmitSlotFormRaw()
  materialResetKey.value++
  slotResetKey.value++
}

async function handleUnloadMaterialSubmit(materialPackCode: string) {
  const isValidPackCode = isMockMode || await validateUnloadMaterialPackCode(materialPackCode)
  if (!isValidPackCode) {
    unloadMaterialValue.value = ""
    focusUnloadMaterialInput()
    return
  }

  const resolved = findUniqueUnloadSlotByPackCode(materialPackCode)
  if (resolved.ok === false) {
    showError(resolved.error)
    unloadMaterialValue.value = ""
    focusUnloadMaterialInput()
    return
  }

  const success = await submitUnload({
    materialPackCode,
    slotIdno: resolved.slotIdno,
  })

  unloadMaterialValue.value = ""
  if (!success) {
    focusUnloadMaterialInput()
    return
  }

  resolvedUnloadSlotIdno.value = resolved.slotIdno
  unloadReplacePhase.value = "replace_material_scan"
  focusUnloadMaterialInput()
}

async function handleForceUnloadSlotSubmit(slotIdno: string) {
  const result = await submitForceUnloadBySlot({
    slotIdno,
    unfeedReason: "WRONG_MATERIAL",
  })

  unloadSlotValue.value = ""
  if (!result.ok) {
    focusUnloadSlotInput()
    return
  }

  resolvedUnloadSlotIdno.value = result.slotIdno ?? slotIdno
  unloadReplacePhase.value = "replace_material_scan"
  focusUnloadMaterialInput()
}

async function handleReplacementMaterialSubmit(materialPackCode: string) {
  const targetSlotIdno = resolvedUnloadSlotIdno.value.trim()
  if (!targetSlotIdno) {
    showError("找不到卸料站位，請重新掃描")
    resetToInitialUnloadPhase()
    unloadMaterialValue.value = ""
    focusByCurrentPhase()
    return
  }

  const canReplace = isMockMode || await validateReplacementMaterialForSlot({
    materialPackCode,
    slotIdno: targetSlotIdno,
  })

  unloadMaterialValue.value = ""
  if (!canReplace) {
    focusUnloadMaterialInput()
    return
  }

  replacementMaterialPackCode.value = materialPackCode
  unloadReplacePhase.value = "replace_slot_scan"
  unloadSlotValue.value = ""
  focusUnloadSlotInput()
}

function handleUnloadMaterialEnter() {
  const material = unloadMaterialValue.value.trim()
  unloadMaterialValue.value = material
  if (!material) return

  if (handleModeTriggerFromUnloadInput(material.toUpperCase())) {
    return
  }

  if (isUnloadScanPhase.value) {
    void handleUnloadMaterialSubmit(material)
    return
  }

  if (isReplaceMaterialPhase.value) {
    void handleReplacementMaterialSubmit(material)
  }
}

async function handleUnloadSlotSubmit() {
  if (!isUnloadMode.value) return

  const slotIdno = unloadSlotValue.value.trim()
  const slotCommand = slotIdno.toUpperCase()
  const targetSlotIdno = resolvedUnloadSlotIdno.value.trim()
  const replacementPackCode = replacementMaterialPackCode.value.trim()

  if (!slotIdno) {
    showError("請輸入槽位")
    focusUnloadSlotInput()
    return
  }

  if (handleModeTriggerFromUnloadInput(slotCommand)) {
    return
  }

  if (isForceUnloadSlotPhase.value) {
    void handleForceUnloadSlotSubmit(slotIdno)
    return
  }

  if (!isReplaceSlotPhase.value) {
    focusUnloadSlotInput()
    return
  }

  const normalizedInput = toCanonicalFujiSlot(slotIdno)
  const normalizedTarget = toCanonicalFujiSlot(targetSlotIdno)
  if (!normalizedInput || !normalizedTarget || normalizedInput !== normalizedTarget) {
    showError(`請掃描原卸料站位 ${targetSlotIdno}`)
    unloadSlotValue.value = ""
    focusUnloadSlotInput()
    return
  }

  if (!replacementPackCode) {
    showError("找不到更換捲號，請重新掃描")
    unloadReplacePhase.value = "replace_material_scan"
    focusUnloadMaterialInput()
    return
  }

  const success = await submitReplace({
    materialPackCode: replacementPackCode,
    slotIdno: targetSlotIdno,
  })

  unloadSlotValue.value = ""
  if (!success) {
    focusUnloadSlotInput()
    return
  }

  handleExitUnloadMode()
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
