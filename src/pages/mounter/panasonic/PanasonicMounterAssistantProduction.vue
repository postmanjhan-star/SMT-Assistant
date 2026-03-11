<script setup lang="ts">
import "ag-grid-community/styles/ag-grid.css"
import "ag-grid-community/styles/ag-theme-balham.css"
import { AgGridVue } from "ag-grid-vue3"
import { NButton, NGi, NPageHeader, NSpace, NTag } from "naive-ui"
import { computed, nextTick, ref } from "vue"
import { storeToRefs } from "pinia"
import { useMeta } from "vue-meta"

import MaterialQueryModal from "./components/MaterialQueryModal.vue"
import StopProductionButton from "./components/StopProductionButton.vue"
import MaterialInventoryBarcodeInput from "@/pages/components/MaterialInventoryBarcodeInput.vue"
import SlotIdnoInput from "@/pages/components/SlotIdnoInput.vue"
import PanasonicRollShortageModal from "@/pages/components/panasonic/PanasonicRollShortageModal.vue"
import PanasonicMounterLayout from "@/pages/components/panasonic/PanasonicMounterLayout.vue"
import PanasonicMounterInfoBar from "@/pages/components/panasonic/PanasonicMounterInfoBar.vue"
import {
  usePostProductionFeedStore,
  type PostProductionMaterialResult,
} from "@/stores/postProductionFeedStore"
import { useSlotInputSelection } from "@/ui/shared/composables/useSlotInputSelection"
import { usePanasonicProductionPage } from "@/ui/workflows/post-production/panasonic/composables/usePanasonicProductionPage"
import { createPanasonicProductionGrid } from "@/ui/workflows/post-production/panasonic/PanasonicProductionGridAdapter"
import { parsePanasonicSlotIdno } from "@/domain/slot/PanasonicSlotParser"
import { usePanasonicInputReset } from "@/ui/shared/composables/panasonic/usePanasonicInputReset"
import {
  PANASONIC_MODE_NAME_NORMAL,
  PANASONIC_MODE_NAME_TESTING,
} from "@/ui/shared/composables/panasonic/usePanasonicConstants"
import type { InputComponentHandle, MaterialMatchedPayload } from "./types/production"

useMeta({ title: "Panasonic Mounter Assistant" })

const MATERIAL_UNLOAD_TRIGGER = "S5555"
const MATERIAL_EXIT_TRIGGER = "S5566"
const MATERIAL_FORCE_UNLOAD_TRIGGER = "S5577"
const MATERIAL_IPQC_TRIGGER = "S5588"
const MATERIAL_UNLOAD_MODE_NAME = "🔄換料卸除"
const MATERIAL_FORCE_UNLOAD_MODE_NAME = "⏏️單站卸除"
const MATERIAL_FEED_MODE_NAME = "📥上料接料"
const MATERIAL_IPQC_MODE_NAME = "🔍IPQC覆檢"

type UnloadModeType = "pack_auto_slot" | "force_single_slot"
type UnloadReplacePhase =
  | "unload_scan"
  | "force_unload_slot_scan"
  | "replace_material_scan"
  | "replace_slot_scan"

const slotIdnoInput = ref<InputComponentHandle | null>(null)
const materialInventoryInput = ref<InputComponentHandle | null>(null)
const unloadMaterialInput = ref<HTMLInputElement | null>(null)
const unloadSlotInput = ref<HTMLInputElement | null>(null)

const isUnloadMode = ref(false)
const isIpqcMode = ref(false)
const unloadModeType = ref<UnloadModeType>("pack_auto_slot")
const unloadReplacePhase = ref<UnloadReplacePhase>("unload_scan")
const unloadMaterialValue = ref("")
const unloadSlotValue = ref("")
const resolvedUnloadSlotIdno = ref("")
const replacementMaterialPackCode = ref("")

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

const gridOptions = createPanasonicProductionGrid()
const rollShortageBindings = { formRef: rollShortageFormRef }

const isUnloadScanPhase = computed(() => unloadReplacePhase.value === "unload_scan")
const isForceUnloadSlotPhase = computed(
  () => unloadReplacePhase.value === "force_unload_slot_scan"
)
const isReplaceMaterialPhase = computed(
  () => unloadReplacePhase.value === "replace_material_scan"
)
const isReplaceSlotPhase = computed(() => unloadReplacePhase.value === "replace_slot_scan")

const productionModeName = computed(() =>
  isTestingMode.value ? PANASONIC_MODE_NAME_TESTING : PANASONIC_MODE_NAME_NORMAL
)

const productionModeType = computed<"warning" | "success">(() =>
  isTestingMode.value ? "warning" : "success"
)

const operationModeName = computed(() => {
  if (isUnloadMode.value) {
    return unloadModeType.value === "force_single_slot"
      ? MATERIAL_FORCE_UNLOAD_MODE_NAME
      : MATERIAL_UNLOAD_MODE_NAME
  }
  if (isIpqcMode.value) return MATERIAL_IPQC_MODE_NAME
  return MATERIAL_FEED_MODE_NAME
})

const unloadMaterialLabel = computed(() => {
  if (isUnloadScanPhase.value) return "卸除捲號（自動定位）"
  if (isReplaceMaterialPhase.value) return "更換捲號"
  return "更換捲號（待掃站位）"
})

const unloadMaterialPlaceholder = computed(() => {
  if (isUnloadScanPhase.value) return "請掃描要卸除的捲號"
  if (isForceUnloadSlotPhase.value) return "請先掃描站位進行強制卸除"
  if (isReplaceMaterialPhase.value) return "請掃描要更換的捲號"
  return replacementMaterialPackCode.value
})

const hasUnloadMaterial = computed(() => {
  if (isReplaceSlotPhase.value) return replacementMaterialPackCode.value.trim().length > 0
  return unloadMaterialValue.value.trim().length > 0
})

const isUnloadMaterialInputDisabled = computed(
  () => isReplaceSlotPhase.value || isForceUnloadSlotPhase.value
)

const isUnloadSlotInputDisabled = computed(() => {
  if (isForceUnloadSlotPhase.value) return false
  if (isReplaceSlotPhase.value) return !hasUnloadMaterial.value
  return true
})

const unloadSlotLabel = computed(() =>
  isForceUnloadSlotPhase.value ? "卸除站位" : "站位編號"
)

const unloadSlotPlaceholder = computed(() => {
  if (isForceUnloadSlotPhase.value) return "請掃描要卸除的站位"
  if (isReplaceSlotPhase.value) return `請掃描原卸料站位 ${resolvedUnloadSlotIdno.value || ""}`
  return "請先掃描更換捲號"
})

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

function focusUnloadMaterialInput() {
  nextTick(() => {
    unloadMaterialInput.value?.focus()
  })
}

function focusUnloadSlotInput() {
  nextTick(() => {
    unloadSlotInput.value?.focus()
  })
}

function clearNormalScanState() {
  store.clearMaterialResult()
  inputs.bumpResetKeys()
  materialInventoryInput.value?.clear?.()
  slotIdnoInput.value?.clear?.()
}

function resetUnloadFlowState(modeType: UnloadModeType = unloadModeType.value) {
  unloadModeType.value = modeType
  unloadReplacePhase.value =
    modeType === "force_single_slot" ? "force_unload_slot_scan" : "unload_scan"
  unloadMaterialValue.value = ""
  unloadSlotValue.value = ""
  resolvedUnloadSlotIdno.value = ""
  replacementMaterialPackCode.value = ""
}

function enterUnloadMode(modeType: UnloadModeType) {
  isUnloadMode.value = true
  isIpqcMode.value = false
  resetUnloadFlowState(modeType)
  clearNormalScanState()

  if (modeType === "force_single_slot") {
    focusUnloadSlotInput()
    return
  }

  focusUnloadMaterialInput()
}

function exitUnloadMode() {
  isUnloadMode.value = false
  resetUnloadFlowState("pack_auto_slot")
  clearNormalScanState()
  focusMaterialInventoryInput()
}

function enterIpqcMode() {
  isIpqcMode.value = true
  if (isUnloadMode.value) {
    isUnloadMode.value = false
    resetUnloadFlowState("pack_auto_slot")
  }
  clearNormalScanState()
  focusMaterialInventoryInput()
}

function exitIpqcMode() {
  isIpqcMode.value = false
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

function handleModeTriggerFromNormalInput(code: string): boolean {
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

function resetToInitialUnloadPhase() {
  unloadReplacePhase.value =
    unloadModeType.value === "force_single_slot"
      ? "force_unload_slot_scan"
      : "unload_scan"
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
  const resolved = findUniqueUnloadSlotByPackCode(materialPackCode)
  if (!resolved.ok) {
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

  const canReplace = await validateReplacementMaterialForSlot({
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

  <MaterialQueryModal v-model:show="showMaterialQueryModal" :uuid="productionUuid" @error="ui.error" />

  <PanasonicMounterLayout>
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
            <PanasonicMounterInfoBar
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
                  退出換料模式
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
      <template v-if="!isUnloadMode">
        <n-gi>
          <MaterialInventoryBarcodeInput
            :disabled="!productionStarted"
            :is-testing-mode="isTestingMode"
            input-test-id="panasonic-main-material-input"
            :get-material-matched-rows="getMaterialMatchedRowArray"
            @matched="handleMaterialMatched"
            :before-scan="handleBeforeMaterialScan"
            :reset-key="inputs.resetKey.value"
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

      <template v-else>
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
    </template>

    <ag-grid-vue
      class="ag-theme-balham-dark grid-content"
      :rowData="rowData"
      :gridOptions="gridOptions"
      @grid-ready="onGridReady"
    />
  </PanasonicMounterLayout>
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
