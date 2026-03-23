<script setup lang="ts">
/* eslint-disable no-restricted-imports -- [Phase-1 whitelist] tracked in REFACTORING_BASELINE.md, fix in Phase 3 */
import "ag-grid-community/styles/ag-grid.css"
import "ag-grid-community/styles/ag-theme-balham.css"
import { AgGridVue } from "ag-grid-vue3"
import type { ColumnApi, GridApi, GridReadyEvent } from "ag-grid-community"
import { NButton, NGi, NPageHeader, NSpace, NTag, NModal, NInput } from "naive-ui"
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
import MounterInfoBar from "@/pages/components/shared/MounterInfoBar.vue"
import {
  usePostProductionFeedStore,
  type PostProductionMaterialResult,
} from "@/stores/postProductionFeedStore"
import { useSlotInputSelection } from "@/ui/shared/composables/useSlotInputSelection"
import { usePanasonicProductionPage } from "@/ui/workflows/post-production/panasonic/composables/usePanasonicProductionPage"
import { createPanasonicProductionGrid } from "@/ui/workflows/post-production/panasonic/PanasonicProductionGridAdapter"
import { parsePanasonicSlotIdno } from "@/domain/slot/PanasonicSlotParser"
import { useUnloadModeController, type UnloadModeType } from "@/ui/shared/composables/useUnloadModeController"
import { usePanasonicInputReset } from "@/ui/shared/composables/panasonic/usePanasonicInputReset"
import {
  PANASONIC_MODE_NAME_NORMAL,
  PANASONIC_MODE_NAME_TESTING,
} from "@/ui/shared/composables/panasonic/usePanasonicConstants"
import type { InputComponentHandle, MaterialMatchedPayload } from "./types/production"
import { createMockScan, MOCK_SCAN_ENABLED } from "@/dev/createMockScan"
import { SmtService } from "@/client"
import { resolveMaterialLookupError } from "@/domain/material/MaterialLookupError"
import {
  MATERIAL_UNLOAD_TRIGGER,
  MATERIAL_EXIT_TRIGGER,
  MATERIAL_FORCE_UNLOAD_TRIGGER,
  MATERIAL_IPQC_TRIGGER,
  USER_SWITCH_TRIGGER,
} from "@/domain/mounter/operationModes"
import { useScanLoginModal } from "@/ui/shared/composables/useScanLoginModal"
import { useAuthStore } from "@/stores/authStore"

useMeta({ title: "Panasonic Mounter Assistant" })

const route = useRoute()
const isMockMode = import.meta.env.DEV && (MOCK_SCAN_ENABLED || route.query.mock_scan === '1')
const mockScan = isMockMode ? createMockScan() : undefined

const slotIdnoInput = ref<InputComponentHandle | null>(null)
const materialInventoryInput = ref<InputComponentHandle | null>(null)
const unloadMaterialInput = ref<HTMLInputElement | null>(null)
const unloadSlotInput = ref<HTMLInputElement | null>(null)

const isUnloadMode = ref(false)
const isIpqcMode = ref(false)

const ipqcMaterialValue = ref("")
const ipqcSlotValue = ref("")
const ipqcMaterialInput = ref<HTMLInputElement | null>(null)
const ipqcSlotInput = ref<HTMLInputElement | null>(null)
const ipqcSavedCorrectStates = ref<Map<string, string | null>>(new Map())

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

function toCanonicalPanasonicSlot(raw: string): string | null {
  const parsed = parsePanasonicSlotIdno(raw)
  if (!parsed) return null
  const slot = String(parsed.slot ?? "").trim()
  const subSlot = String(parsed.subSlot ?? "")
    .trim()
    .toUpperCase()
  if (!slot) return null
  return subSlot ? `${slot}-${subSlot}` : slot
}

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
  toCanonicalSlot: toCanonicalPanasonicSlot,
  getUnloadMaterialInputRef: () => unloadMaterialInput.value,
  getUnloadSlotInputRef: () => unloadSlotInput.value,
})

function enterUnloadMode(modeType: UnloadModeType) {
  isUnloadMode.value = true
  isIpqcMode.value = false
  resetUnloadFlowState(modeType)
  clearNormalScanState()
  focusByCurrentPhase()
}

function exitUnloadMode() {
  isUnloadMode.value = false
  resetUnloadFlowState("pack_auto_slot")
  clearNormalScanState()
  focusMaterialInventoryInput()
}

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

onMounted(() => {
  autoOpenIfUnauthenticated()
})

function showIpqcColumns(visible: boolean) {
  localColumnApi.value?.setColumnVisible("inspectMaterialPackCode", visible)
  localColumnApi.value?.setColumnVisible("inspectTime", visible)
}

function focusIpqcMaterialInput() {
  nextTick(() => {
    ipqcMaterialInput.value?.focus()
  })
}

function focusIpqcSlotInput() {
  nextTick(() => {
    ipqcSlotInput.value?.focus()
  })
}

function findRowBySlotIdno(slotIdno: string) {
  const parsed = parsePanasonicSlotIdno(slotIdno)
  if (!parsed) return null
  return (rowData.value ?? []).find(
    (row: any) =>
      String(row.slotIdno ?? "").trim() === String(parsed.slot ?? "").trim() &&
      String(row.subSlotIdno ?? "").trim() === String(parsed.subSlot ?? "").trim()
  )
}

function parseAppendedCodes(value: string | null | undefined): string[] {
  const raw = String(value ?? "").trim()
  if (!raw) return []
  return raw.split(",").map((code) => code.trim()).filter((code) => code.length > 0)
}

function getCurrentPackCode(row: any): string {
  const appended = parseAppendedCodes(row.appendedMaterialInventoryIdno)
  if (appended.length > 0) return appended[appended.length - 1]
  return String(row.materialInventoryIdno ?? "").trim()
}

function enterIpqcMode() {
  isIpqcMode.value = true
  if (isUnloadMode.value) {
    isUnloadMode.value = false
    resetUnloadFlowState("pack_auto_slot")
  }
  clearNormalScanState()

  // 儲存目前 correct 狀態，全部設為 ⛔
  const saved = new Map<string, string | null>()
  for (const row of rowData.value) {
    const key = `${row.slotIdno}-${row.subSlotIdno ?? ""}`
    saved.set(key, row.correct as string | null)
    row.correct = "UNLOADED_MATERIAL_PACK" as any
  }
  ipqcSavedCorrectStates.value = saved

  if (localGridApi.value) {
    localGridApi.value.applyTransaction({ update: [...rowData.value] })
  }

  showIpqcColumns(true)
  focusIpqcMaterialInput()
}

function exitIpqcMode() {
  isIpqcMode.value = false
  // 恢復原本 correct 狀態
  for (const row of rowData.value) {
    const key = `${row.slotIdno}-${row.subSlotIdno ?? ""}`
    const saved = ipqcSavedCorrectStates.value.get(key)
    if (saved !== undefined) {
      row.correct = saved as any
    }
  }
  ipqcSavedCorrectStates.value.clear()

  if (localGridApi.value) {
    localGridApi.value.applyTransaction({ update: [...rowData.value] })
  }

  showIpqcColumns(false)
  ipqcMaterialValue.value = ""
  ipqcSlotValue.value = ""
  clearNormalScanState()
  focusMaterialInventoryInput()
}

function toggleIpqcMode() {
  if (isIpqcMode.value) {
    exitIpqcMode()
    return
  }
  enterIpqcMode()
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
  if (code === USER_SWITCH_TRIGGER) {
    exitIpqcMode()
    handleUserSwitchTrigger(code)
    ipqcMaterialValue.value = ""
    return
  }
  if (code === MATERIAL_UNLOAD_TRIGGER || code === MATERIAL_FORCE_UNLOAD_TRIGGER) {
    exitIpqcMode()
    handleModeTriggerFromNormalInput(code)
    ipqcMaterialValue.value = ""
    return
  }

  // ERP 驗證
  if (!isMockMode) {
    try {
      await SmtService.getMaterialInventoryForSmt({ materialInventoryIdno: materialPackCode })
    } catch (error) {
      ui.error(resolveMaterialLookupError(error))
      ipqcMaterialValue.value = ""
      focusIpqcMaterialInput()
      return
    }
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
  const row = findRowBySlotIdno(slotIdno)
  if (!row) {
    ui.error(`找不到槽位 ${slotIdno}`)
    ipqcSlotValue.value = ""
    focusIpqcSlotInput()
    return
  }

  const currentPackCode = getCurrentPackCode(row)
  if (materialPackCode !== currentPackCode) {
    ui.error(`料號不符：掃描 ${materialPackCode}，槽位應為 ${currentPackCode}`)
    ipqcSlotValue.value = ""
    ipqcMaterialValue.value = ""
    focusIpqcMaterialInput()
    return
  }

  // 標記已巡檢 ✅
  row.correct = "MATCHED_MATERIAL_PACK" as any
  row.inspectMaterialPackCode = materialPackCode
  row.inspectTime = new Date().toISOString()
  row.inspectCount = (row.inspectCount ?? 0) + 1
  row.remark = `巡檢 ${row.inspectCount} 次`

  if (localGridApi.value) {
    localGridApi.value.applyTransaction({ update: [row] })
  }

  // 即時上傳巡檢紀錄
  const parsed = parsePanasonicSlotIdno(slotIdno)
  if (parsed) {
    try {
      const stat = (rowData.value as any[]).find(
        (r: any) => r.slotIdno === parsed.slot && (r.subSlotIdno ?? "") === (parsed.subSlot ?? "")
      )
      if (stat?.id) {
        await SmtService.addPanasonicMounterItemStatRoll({
          requestBody: {
            stat_item_id: stat.id,
            operator_id: currentUsername.value || null,
            operation_time: new Date().toISOString(),
            slot_idno: parsed.slot,
            sub_slot_idno: parsed.subSlot ?? null,
            material_pack_code: materialPackCode,
            operation_type: "FEED" as any,
            feed_material_pack_type: "INSPECTION_MATERIAL_PACK" as any,
            check_pack_code_match: "MATCHED_MATERIAL_PACK" as any,
            unfeed_reason: null,
          },
        })
      }
    } catch {
      // 上傳失敗不影響 UI
    }
  }

  ipqcSlotValue.value = ""
  ipqcMaterialValue.value = ""
  focusIpqcMaterialInput()
}

function handleModeTriggerFromNormalInput(code: string): boolean {
  if (handleUserSwitchTrigger(code)) return true
  if (code === MATERIAL_UNLOAD_TRIGGER) {
    isIpqcMode.value = false
    enterUnloadMode("pack_auto_slot")
    return true
  }

  if (code === MATERIAL_FORCE_UNLOAD_TRIGGER) {
    isIpqcMode.value = false
    enterUnloadMode("force_single_slot")
    return true
  }

  if (code === MATERIAL_IPQC_TRIGGER) {
    toggleIpqcMode()
    return true
  }

  if (code === MATERIAL_EXIT_TRIGGER && isIpqcMode.value) {
    exitIpqcMode()
    return true
  }

  return false
}

function handleModeTriggerFromUnloadInput(code: string): boolean {
  if (code === MATERIAL_IPQC_TRIGGER) {
    exitUnloadMode()
    enterIpqcMode()
    return true
  }

  if (code === MATERIAL_EXIT_TRIGGER) {
    exitUnloadMode()
    return true
  }

  if (code === MATERIAL_UNLOAD_TRIGGER || code === MATERIAL_FORCE_UNLOAD_TRIGGER) {
    exitUnloadMode()
    return true
  }

  return false
}

async function handleBeforeMaterialScan(barcode: string) {
  const code = barcode.trim().toUpperCase()
  return !handleModeTriggerFromNormalInput(code)
}

async function handleBeforeSlotSubmit(raw: string) {
  const code = raw.trim().toUpperCase()
  return !handleModeTriggerFromNormalInput(code)
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
    ui.error(resolved.error)
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
    ui.error("找不到卸料站位，請重新掃描")
    resetToInitialUnloadPhase()
    unloadMaterialValue.value = ""

    if (isForceUnloadSlotPhase.value) {
      focusUnloadSlotInput()
    } else {
      focusUnloadMaterialInput()
    }
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
    ui.error("請輸入站位")
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

  const normalizedInput = toCanonicalPanasonicSlot(slotIdno)
  const normalizedTarget = toCanonicalPanasonicSlot(targetSlotIdno)
  if (!normalizedInput || !normalizedTarget || normalizedInput !== normalizedTarget) {
    ui.error(`請掃描原卸料站位 ${targetSlotIdno}`)
    unloadSlotValue.value = ""
    focusUnloadSlotInput()
    return
  }

  if (!replacementPackCode) {
    ui.error("找不到更換捲號，請重新掃描")
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

  exitUnloadMode()
}

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

  <n-modal
    :show="showLoginModal"
    :mask-closable="!isLoginRequired"
    :close-on-esc="!isLoginRequired"
    :closable="!isLoginRequired"
    @update:show="(v) => { if (!v && !isLoginRequired) closeLoginModal() }"
    preset="card"
    style="width: 420px"
    title="掃碼登入"
  >
    <div data-testid="scan-login-modal">
      <div style="margin-bottom: 8px; color: #aaa; font-size: 13px">
        目前使用者：{{ loginCurrentUsername || '（未登入）' }}
      </div>
      <n-input
        v-model:value="loginInput"
        placeholder="請掃描操作員條碼"
        :disabled="isLoginLoading"
        data-testid="scan-login-input"
        autofocus
        @keydown.enter.prevent="handleLoginSubmit"
      />
      <div
        v-if="loginError"
        style="color: #e88080; margin-top: 6px; font-size: 13px"
        data-testid="scan-login-error"
      >{{ loginError }}</div>
    </div>
    <template #footer>
      <n-button v-if="!isLoginRequired" @click="closeLoginModal">取消</n-button>
      <n-button type="primary" :loading="isLoginLoading" @click="handleLoginSubmit">登入</n-button>
    </template>
  </n-modal>
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
