<script setup lang="ts">
import "ag-grid-community/styles/ag-grid.css"
import "ag-grid-community/styles/ag-theme-balham.css"
import { AgGridVue } from "ag-grid-vue3"
import { NButton, NForm, NFormItem, NGi, NInput, NTag } from "naive-ui"
import { computed, nextTick, ref, watch } from "vue"
import { useMeta } from "vue-meta"

import MaterialQueryModal from "@/pages/mounter/fuji/components/MaterialQueryModal.vue"
import FujiMounterLayout from "@/pages/components/fuji/FujiMounterLayout.vue"
import FujiMounterHeader from "@/pages/components/fuji/FujiMounterHeader.vue"
import { parseFujiSlotIdno } from "@/domain/slot/FujiSlotParser"
import { useFujiProductionPage } from "@/ui/workflows/post-production/fuji/composables/useFujiProductionPage"
import { createFujiProductionGridOptions } from "@/ui/workflows/post-production/fuji/createFujiProductionGridOptions"

useMeta({ title: "Fuji Mounter Production" })

const MATERIAL_FORCE_UNLOAD_TRIGGER = "S5577"
const MATERIAL_FORCE_UNLOAD_MODE_NAME = "單站強制卸除"

type UnloadModeType = "pack_auto_slot" | "force_single_slot"
type UnloadReplacePhase =
  | "unload_scan"
  | "force_unload_slot_scan"
  | "replace_material_scan"
  | "replace_slot_scan"

const {
  MODE_NAME_TESTING,
  MODE_NAME_NORMAL,
  MATERIAL_UNLOAD_TRIGGER,
  MATERIAL_UNLOAD_MODE_NAME,
  workOrderIdno,
  productIdno,
  mounterIdno,
  boardSide,
  isTestingMode,
  productionUuid,
  productionStarted,
  rowData,
  materialFormValue,
  slotFormValue,
  materialInputRef,
  slotInputRef,
  isUnloadMode,
  unloadMaterialValue,
  unloadSlotValue,
  showMaterialQueryModal,
  onGridReady,
  onClickBackArrow,
  onSubmitMaterialInventoryForm,
  onSubmitSlotForm,
  submitUnload,
  submitForceUnloadBySlot,
  findUniqueUnloadSlotByPackCode,
  validateReplacementMaterialForSlot,
  submitReplace,
  enterUnloadMode,
  exitUnloadMode,
  onStopProduction,
  onMaterialQuery,
  showError,
} = useFujiProductionPage()

const unloadMaterialInputRef = ref<HTMLInputElement | null>(null)
const unloadSlotInputRef = ref<HTMLInputElement | null>(null)
const unloadModeType = ref<UnloadModeType>("pack_auto_slot")
const unloadReplacePhase = ref<UnloadReplacePhase>("unload_scan")
const resolvedUnloadSlotIdno = ref("")
const replacementMaterialPackCode = ref("")

const gridOptions = createFujiProductionGridOptions()

const currentModeName = computed(() => {
  if (isUnloadMode.value) {
    return unloadModeType.value === "force_single_slot"
      ? MATERIAL_FORCE_UNLOAD_MODE_NAME
      : MATERIAL_UNLOAD_MODE_NAME
  }
  return isTestingMode.value ? MODE_NAME_TESTING : MODE_NAME_NORMAL
})

const currentModeType = computed<"info" | "warning" | "success">(() => {
  if (isUnloadMode.value) return "info"
  return isTestingMode.value ? "warning" : "success"
})

const isUnloadScanPhase = computed(() => unloadReplacePhase.value === "unload_scan")
const isForceUnloadSlotPhase = computed(
  () => unloadReplacePhase.value === "force_unload_slot_scan"
)
const isReplaceMaterialPhase = computed(
  () => unloadReplacePhase.value === "replace_material_scan"
)
const isReplaceSlotPhase = computed(() => unloadReplacePhase.value === "replace_slot_scan")

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

function toCanonicalFujiSlot(raw: string): string | null {
  const parsed = parseFujiSlotIdno(raw)
  if (!parsed) return null
  return `${parsed.machineIdno}-${parsed.stage}-${parsed.slot}`
}

function isExitTrigger(value: string) {
  const code = value.trim().toUpperCase()
  return code === MATERIAL_UNLOAD_TRIGGER || code === MATERIAL_FORCE_UNLOAD_TRIGGER
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

function focusUnloadMaterialInput() {
  nextTick(() => {
    unloadMaterialInputRef.value?.focus()
  })
}

function focusUnloadSlotInput() {
  nextTick(() => {
    unloadSlotInputRef.value?.focus()
  })
}

function focusByCurrentPhase() {
  if (isForceUnloadSlotPhase.value || isReplaceSlotPhase.value) {
    focusUnloadSlotInput()
    return
  }
  focusUnloadMaterialInput()
}

function handleExitUnloadMode() {
  resetUnloadFlowState("pack_auto_slot")
  exitUnloadMode()
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

async function onMainMaterialSubmit() {
  const barcode = materialFormValue.value.materialInventoryIdno.trim().toUpperCase()
  if (barcode === MATERIAL_UNLOAD_TRIGGER) {
    materialFormValue.value.materialInventoryIdno = ""
    unloadModeType.value = "pack_auto_slot"
    enterUnloadMode()
    return
  }

  if (barcode === MATERIAL_FORCE_UNLOAD_TRIGGER) {
    materialFormValue.value.materialInventoryIdno = ""
    unloadModeType.value = "force_single_slot"
    enterUnloadMode()
    return
  }

  await onSubmitMaterialInventoryForm()
}

async function handleUnloadMaterialSubmit(materialPackCode: string) {
  const resolved = findUniqueUnloadSlotByPackCode(materialPackCode)
  if (!resolved.ok) {
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

function resetToInitialUnloadPhase() {
  unloadReplacePhase.value =
    unloadModeType.value === "force_single_slot"
      ? "force_unload_slot_scan"
      : "unload_scan"
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

  if (isExitTrigger(material)) {
    handleExitUnloadMode()
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
  const targetSlotIdno = resolvedUnloadSlotIdno.value.trim()
  const replacementPackCode = replacementMaterialPackCode.value.trim()

  if (!slotIdno) {
    showError("請輸入槽位")
    focusUnloadSlotInput()
    return
  }

  if (isExitTrigger(slotIdno)) {
    handleExitUnloadMode()
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
  <MaterialQueryModal v-model:show="showMaterialQueryModal" :uuid="productionUuid" @error="showError" />

  <FujiMounterLayout :sticky-inputs="false">
    <template #header>
      <FujiMounterHeader
        :mounter-idno="mounterIdno"
        :is-testing-mode="isTestingMode"
        :work-order-idno="workOrderIdno"
        :product-idno="productIdno"
        :board-side="boardSide ?? ''"
        @back="onClickBackArrow"
      >
        <template #actions>
          <n-tag data-testid="fuji-mode-tag" :type="currentModeType" size="small" bordered>
            {{ currentModeName }}
          </n-tag>

          <template v-if="isUnloadMode">
            <n-button
              data-testid="fuji-exit-unload-mode-btn"
              type="error"
              size="small"
              @click="handleExitUnloadMode"
            >
              退出換料模式
            </n-button>
          </template>
          <template v-else>
            <n-button v-if="productionStarted" type="error" size="small" @click="onStopProduction">
              停止生產
            </n-button>
            <n-button v-else type="success" size="small" disabled>尚未開始生產</n-button>
            <n-button type="info" size="small" @click="onMaterialQuery">物料追溯查詢</n-button>
          </template>
        </template>
      </FujiMounterHeader>
    </template>

    <template #inputs>
      <template v-if="!isUnloadMode">
        <n-gi>
          <n-form size="large" :model="materialFormValue" @submit.prevent="onMainMaterialSubmit">
            <n-form-item label="物料條碼">
              <n-input
                data-testid="material-input"
                type="text"
                size="large"
                v-model:value.lazy="materialFormValue.materialInventoryIdno"
                autofocus
                ref="materialInputRef"
                :disabled="!productionStarted"
                placeholder="輸入物料條碼"
              />
            </n-form-item>
          </n-form>
        </n-gi>
        <n-gi>
          <n-form size="large" :model="slotFormValue" @submit.prevent="onSubmitSlotForm">
            <n-form-item label="槽位">
              <n-input
                type="text"
                size="large"
                v-model:value.lazy="slotFormValue.slotIdno"
                ref="slotInputRef"
                :disabled="!productionStarted"
                placeholder="輸入槽位"
              />
            </n-form-item>
          </n-form>
        </n-gi>
      </template>

      <template v-else>
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
    </template>

    <ag-grid-vue
      class="ag-theme-balham-dark"
      :rowData="rowData"
      style="height: 100%"
      :gridOptions="gridOptions"
      @grid-ready="onGridReady"
    />
  </FujiMounterLayout>
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
