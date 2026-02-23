<script setup lang="ts">
import "ag-grid-community/styles/ag-grid.css"
import "ag-grid-community/styles/ag-theme-balham.css"
import { AgGridVue } from "ag-grid-vue3"
import {
  NButton,
  NGi,
  NPageHeader,
  NSpace,
  NTag,
  useDialog,
  type FormInst,
} from "naive-ui"
import { computed, ref, watchEffect, type Ref } from "vue"
import { useMeta } from "vue-meta"
import { useRoute, useRouter } from "vue-router"
import { useAuthStore } from "@/stores/authStore"
import { useUiNotifier } from "@/ui/shared/composables/useUiNotifier"

import MaterialInventoryBarcodeInput from "@/pages/components/MaterialInventoryBarcodeInput.vue"
import SlotIdnoInput from "@/pages/components/SlotIdnoInput.vue"
import StartProductionButton from "./components/StartProductionButton.vue"
import MaterialQueryModal from "./components/MaterialQueryModal.vue"
import PanasonicRollShortageModal from "@/pages/components/panasonic/PanasonicRollShortageModal.vue"
import PanasonicMounterLayout from "@/pages/components/panasonic/PanasonicMounterLayout.vue"
import PanasonicMounterInfoBar from "@/pages/components/panasonic/PanasonicMounterInfoBar.vue"

import type {
  InputComponentHandle,
  MaterialMatchedPayload,
  ProductionRowModel,
} from "./types/production"
import { createProductionGridOptions } from "@/ui/workflows/preproduction/panasonic/createProductionGridOptions"
import { useSlotResultNotifier } from "@/ui/shared/composables/useSlotResultNotifier"
import { useProductionState } from "@/ui/workflows/preproduction/panasonic/composables/useProductionState"
import { useRollShortageForm } from "@/ui/workflows/preproduction/panasonic/composables/useRollShortageForm"
import { usePanasonicProductionData } from "@/ui/workflows/preproduction/panasonic/composables/usePanasonicProductionData"
import { usePanasonicSlotFlow } from "@/ui/workflows/preproduction/panasonic/composables/usePanasonicSlotFlow"
import { useProductionGridBinding } from "@/ui/workflows/preproduction/panasonic/composables/useProductionGridBinding"
import { useSlotInputSelection } from "@/ui/shared/composables/useSlotInputSelection"
import { parsePanasonicSlotIdno } from "@/domain/slot/PanasonicSlotParser"
import { MaterialMatchingPolicy } from "@/domain/preproduction/MaterialMatchingPolicy"
import { SubmitSlotUseCase } from "@/application/preproduction/SubmitSlotUseCase"
import {
  SubmitRollShortageUseCase,
  type SubmitRollShortageError,
} from "@/application/preproduction/SubmitRollShortageUseCase"
import { ProductionLifecycleUseCase } from "@/application/preproduction/ProductionLifecycleUseCase"
import { ApiSmtProductionRepository } from "@/infrastructure/repositories/SmtProductionRepository"
import { usePanasonicInputReset } from "@/ui/shared/composables/panasonic/usePanasonicInputReset"

const route = useRoute()
const router = useRouter()
useMeta({ title: "Panasonic Mounter Assistant" })

const MODE_NAME_TESTING = "🧪 試產生產模式"
const MODE_NAME_NORMAL = "✅ 正式生產模式"

type StartProductionButtonHandle = {
  submit: (rows?: unknown[]) => Promise<void> | void
}

type SlotInputResult = {
  success: boolean
  materialInventory?: MaterialMatchedPayload["materialInventory"] | null
  matchedRows?: MaterialMatchedPayload["matchedRows"]
}

const slotIdnoInput = ref<InputComponentHandle | null>(null)
const materialInventoryInput = ref<InputComponentHandle | null>(null)
const startProductionBtnRef = ref<StartProductionButtonHandle | null>(null)

const authStore = useAuthStore()
const currentUsername = computed(
  () =>
    authStore.authState.OAuth2PasswordBearer?.username ??
    authStore.authState.HTTPBasic?.value?.username ??
    ""
)

const dialog = useDialog()
const { success: showSuccess, warn: showWarn, error: showError, info } =
  useUiNotifier()

useSlotResultNotifier({
  success: showSuccess,
  warn: showWarn,
  error: showError,
})

const materialInventoryResult = ref<SlotInputResult | null>(null)

function normalizeRouteValue(val: unknown): string {
  if (Array.isArray(val)) return String(val[0] ?? "").trim()
  return String(val ?? "").trim()
}

const isTestingMode = route.query.testing_mode === "1"

const workOrderIdno = computed(() => normalizeRouteValue(route.params.workOrderIdno))
const productIdno = computed(() => normalizeRouteValue(route.query.product_idno))
const mounterIdno = computed(() => normalizeRouteValue(route.params.mounterIdno))
const machineSideQuery = computed(() => normalizeRouteValue(route.query.machine_side))
const workSheetSideQuery = computed(() =>
  normalizeRouteValue(route.query.work_sheet_side)
)

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

const { mounterData, rowData } = usePanasonicProductionData()
const { onGridReady } = useProductionGridBinding({
  resetInputs: resetInputsAfterSlotSubmit,
})
const gridOptions = createProductionGridOptions(rowData)

function onClickBackArrow() {
  router.push("/smt/panasonic-mounter/")
}

function getMaterialMatchedRows(materialIdno: string): ProductionRowModel[] {
  return MaterialMatchingPolicy.filterUnboundRows(rowData.value, materialIdno)
}

function handleMaterialMatched(payload: MaterialMatchedPayload) {
  inputs.onMaterialMatched({
    success: true,
    materialInventory: payload.materialInventory,
    matchedRows: payload.matchedRows,
  })
}

const {
  productionStarted,
  productionUuid,
  start: startProduction,
  stop: stopProduction,
} = useProductionState()

const productionLifecycleUseCase = new ProductionLifecycleUseCase({
  start: startProduction,
  stop: stopProduction,
})

const statMap = new Map<string, { id: number }>()

function makeSlotKey(slotIdno: string, subSlotIdno?: string | null): string {
  const slot = (slotIdno ?? "").trim()
  const sub = (subSlotIdno ?? "").trim()
  return sub ? `${slot}-${sub}` : slot
}

watchEffect(() => {
  statMap.clear()
  const items = mounterData.value?.panasonic_mounter_file_items ?? []
  items.forEach((item) => {
    if (!item?.id || !item.slot_idno) return
    const key = makeSlotKey(item.slot_idno, item.sub_slot_idno)
    statMap.set(key, { id: item.id })
  })
})

function getStatBySlotIdno(slotIdno: string): { id: number } | null {
  const parsed = parsePanasonicSlotIdno(slotIdno.trim())
  if (!parsed) return null
  const key = makeSlotKey(parsed.slot, parsed.subSlot)
  return statMap.get(key) ?? statMap.get(parsed.slot) ?? null
}

function handleProductionStarted(productionStatUuid: string) {
  const intent = productionLifecycleUseCase.handleStarted({
    uuid: productionStatUuid,
    currentPath: route.path,
    currentQuery: route.query,
  })

  router.replace(intent.replace)
  router.push(intent.push)
}

async function onStopProduction() {
  dialog.warning({
    title: "結束生產確認",
    content: "確定要結束生產嗎？",
    positiveText: "確定",
    negativeText: "取消",
    onPositiveClick: async () => {
      await productionLifecycleUseCase.stop()
      return showSuccess("生產已結束")
    },
    onNegativeClick: () => undefined,
  })
}

const {
  show: showRollShortageModal,
  formRef: rollShortageFormRef,
  formValue: rollShortageFormValue,
  rules: rollShortageRules,
  open: openRollShortage,
  close: closeRollShortage,
} = useRollShortageForm()

const rollTypeOptions = [
  { label: "接料", value: "roll" },
  { label: "新捲料", value: "new" },
]

function onRollShortage() {
  openRollShortage()
}

function resetRollShortageForm() {
  rollShortageFormValue.value = {
    materialInventoryIdno: "",
    slotIdno: "",
    type: "",
  }
}

const { handleSlotSubmit: submitSlot } = usePanasonicSlotFlow({
  isTestingMode,
  getResult: () => materialInventoryResult.value,
  autoUpload: (rows) => {
    startProductionBtnRef.value?.submit(rows)
  },
  onResetInputs: resetInputsAfterSlotSubmit,
})

const smtRepository = new ApiSmtProductionRepository()
const submitSlotUseCase = new SubmitSlotUseCase({ submitSlot })
const submitRollShortageUseCase = new SubmitRollShortageUseCase({
  repository: smtRepository,
  getRowData: () => rowData.value,
  getStatBySlotIdno,
  isTestingMode: () => isTestingMode,
  operatorId: () => currentUsername.value || null,
  now: () => new Date().toISOString(),
})

async function handleSlotSubmitWithPolicy(payload: {
  slotIdno: string
  slot: string
  subSlot: string
}) {
  const result = await submitSlotUseCase.execute(payload)
  return result.success
}

function getRollShortageErrorMessage(error: SubmitRollShortageError): string | null {
  switch (error.code) {
    case "materialInventoryIdno_required":
      return "請輸入物料號"
    case "slotIdno_required":
      return "請輸入槽位"
    case "type_required":
      return "請選擇物料類型"
    case "stat_not_found":
      return "找不到對應的槽位"
    case "row_not_found":
      return `找不到槽位 ${error.slotIdno}`
    case "no_material_in_grid":
      return "表格內無此物料"
    case "inventory_not_found":
      return "查無此條碼"
    case "erp_timeout":
      return "ERP 連線超時，請確認 ERP 連線"
    case "erp_bad_gateway":
      return "ERP 連線錯誤，請確認 ERP 連線"
    case "server_error":
      return "系統錯誤"
    case "unknown_api_error":
      return "未知錯誤"
    case "unknown_error":
      return "發生未知例外"
    default:
      return null
  }
}

async function onSubmitShortage() {
  try {
    await rollShortageFormRef.value?.validate()
  } catch {
    return
  }

  const result = await submitRollShortageUseCase.execute({
    materialInventoryIdno: rollShortageFormValue.value.materialInventoryIdno,
    slotIdno: rollShortageFormValue.value.slotIdno,
    type: rollShortageFormValue.value.type,
  })

  if (result.ok === false) {
    const message = getRollShortageErrorMessage(result.error)
    if (message) showError(message)
    return
  }

  if (result.info?.code === "testing_virtual_material") {
    info(`${MODE_NAME_TESTING}：使用物料 [廠商測試新料] ${result.info.idno}`)
  }

  const { row, rowId, newAppendedMaterialInventoryIdno } = result.update
  const materialRowNode = gridOptions.api.getRowNode(rowId)
  if (!materialRowNode) {
    showError(`找不到AG Grid 資料列 ${rowId}`)
    return
  }

  showSuccess("新增成功")
  materialRowNode.setDataValue(
    "appendedMaterialInventoryIdno",
    newAppendedMaterialInventoryIdno
  )
  row.appendedMaterialInventoryIdno = newAppendedMaterialInventoryIdno

  closeRollShortage()
  resetRollShortageForm()
}

const showMaterialQueryModal = ref(false)

function onMaterialQuery() {
  showMaterialQueryModal.value = true
}

function onRollShortageModalUpdate(value: boolean) {
  if (!value) closeRollShortage()
}

function getRollShortageFormRef(): Ref<FormInst | null> {
  return rollShortageFormRef
}
</script>

<template>
  <PanasonicRollShortageModal
    :show="showRollShortageModal"
    :form-value="rollShortageFormValue"
    :rules="rollShortageRules"
    :roll-type-options="rollTypeOptions"
    :form-ref="getRollShortageFormRef()"
    @update:show="onRollShortageModalUpdate"
    @cancel="closeRollShortage"
    @submit="onSubmitShortage"
  />

  <MaterialQueryModal v-model:show="showMaterialQueryModal" :uuid="productionUuid" @error="showError" />

  <PanasonicMounterLayout>
    <template #header>
      <n-page-header @back="onClickBackArrow" class="page-header">
        <template #title>
          <div class="page-title">
            <span>{{ mounterIdno }}</span>
            <n-tag :type="isTestingMode ? 'warning' : 'success'" size="small" bordered>
              {{ isTestingMode ? MODE_NAME_TESTING : MODE_NAME_NORMAL }}
            </n-tag>
          </div>
        </template>
        <template #default>
          <div class="page-toolbar">
            <PanasonicMounterInfoBar
              :work-order="workOrderIdno"
              :product="productIdno"
              :board-side="workSheetSideQuery"
              :machine-side="machineSideQuery"
            />

            <n-space size="small">
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
                @started="handleProductionStarted"
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
            </n-space>
          </div>
        </template>
      </n-page-header>
    </template>

    <template #inputs>
      <n-gi>
        <MaterialInventoryBarcodeInput
          :is-testing-mode="isTestingMode"
          ref="materialInventoryInput"
          :get-material-matched-rows="getMaterialMatchedRows"
          @matched="handleMaterialMatched"
          :reset-key="inputs.resetKey.value"
          @error="showError"
        />
      </n-gi>

      <n-gi>
        <SlotIdnoInput
          :is-testing-mode="isTestingMode"
          :has-material="inputs.hasMaterial.value"
          :parse-slot-idno="parsePanasonicSlotIdno"
          :reset-key="inputs.slotResetKey.value"
          ref="slotIdnoInput"
          :key="inputs.slotResetKey.value"
          @submit="handleSlotSubmitWithPolicy"
          @error="showError"
        />
      </n-gi>
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
</style>

<style>
body {
  /* This does not work. */
  margin-block-end: env(keyboard-inset-height, 5000px);
}
</style>
