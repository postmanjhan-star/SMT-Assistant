<script setup lang="ts">
/* eslint-disable no-restricted-imports -- [Phase-1 whitelist] tracked in REFACTORING_BASELINE.md, fix in Phase 3 */
import "ag-grid-community/styles/ag-grid.css"
import "ag-grid-community/styles/ag-theme-balham.css"
import { AgGridVue } from "ag-grid-vue3"
import type { ColumnApi, GridApi, GridReadyEvent } from "ag-grid-community"
import { NButton, NGi, NPageHeader, NSpace, NTag } from "naive-ui"
import { ref, computed, watch, nextTick } from "vue"
import { useMeta } from "vue-meta"
import { useRoute } from "vue-router"

import MaterialInventoryBarcodeInput from "@/pages/components/MaterialInventoryBarcodeInput.vue"
import SlotIdnoInput from "@/pages/components/SlotIdnoInput.vue"
import StartProductionButton from "./components/StartProductionButton.vue"
import MounterMaterialQueryModal, { type MaterialQueryRowModel } from "@/pages/components/shared/MounterMaterialQueryModal.vue"
import { usePanasonicMaterialQueryState } from "@/ui/workflows/post-production/panasonic/composables/usePanasonicMaterialQueryState"
import PanasonicRollShortageModal from "@/pages/components/panasonic/PanasonicRollShortageModal.vue"
import MounterLayout from "@/pages/components/shared/MounterLayout.vue"
import MounterInfoBar from "@/pages/components/shared/MounterInfoBar.vue"

import type {
  InputComponentHandle,
  MaterialMatchedPayload,
  SlotInputResult,
} from "./types/production"
import { createProductionGridOptions } from "@/ui/workflows/preproduction/panasonic/createProductionGridOptions"
import { useSlotInputSelection } from "@/ui/shared/composables/useSlotInputSelection"
import { parsePanasonicSlotIdno } from "@/domain/slot/PanasonicSlotParser"
import { usePanasonicInputReset } from "@/ui/shared/composables/panasonic/usePanasonicInputReset"
import { usePanasonicDetailPage } from "@/ui/workflows/preproduction/panasonic/composables/usePanasonicDetailPage"
import {
  PANASONIC_MODE_NAME_NORMAL,
  PANASONIC_MODE_NAME_TESTING,
} from "@/ui/shared/composables/panasonic/usePanasonicConstants"
import { createMockScan, MOCK_SCAN_ENABLED } from "@/dev/createMockScan"
import { SmtService } from "@/client"
import { resolveMaterialLookupError } from "@/domain/material/MaterialLookupError"
import { appendMaterialCode, removeMaterialCode } from "@/domain/production/PostProductionFeedRules"
import {
  MATERIAL_UNLOAD_TRIGGER,
  MATERIAL_EXIT_TRIGGER,
  MATERIAL_FORCE_UNLOAD_TRIGGER,
  MATERIAL_IPQC_TRIGGER,
  MATERIAL_UNLOAD_MODE_NAME,
  MATERIAL_FORCE_UNLOAD_MODE_NAME,
  MATERIAL_IPQC_MODE_NAME,
  MATERIAL_FEED_MODE_NAME,
} from "@/domain/mounter/operationModes"
import type { IpqcInspectionRecord } from "@/domain/mounter/ipqcTypes"
import type { CorrectState } from "./types/production"

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
const cacheEnabled = ref(true)
const hydratedKey = ref<string | null>(null)
const readyToPersist = ref(false)
const gridApi = ref<GridApi | null>(null)
const columnApi = ref<ColumnApi | null>(null)
const pendingGridSync = ref(false)
const unloadMaterialInput = ref<HTMLInputElement | null>(null)
const unloadSlotInput = ref<HTMLInputElement | null>(null)

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
  showError,
} = usePanasonicDetailPage({
  onResetInputs: resetInputsAfterSlotSubmit,
  getSlotInputResult: () => materialInventoryResult.value,
  autoUploadRows: (rows) => {
    startProductionBtnRef.value?.submit(rows)
  },
  isMockMode,
})

const { rowData: materialQueryRawData, load: loadMaterialQuery } = usePanasonicMaterialQueryState(productionUuid)
const materialQueryRows = computed(() => materialQueryRawData.value as MaterialQueryRowModel[])

const gridOptions = createProductionGridOptions(rowData)
const rollShortageBindings = { formRef: rollShortageFormRef }

type UnloadModeType = "pack_auto_slot" | "force_single_slot"
type UnloadReplacePhase =
  | "unload_scan"
  | "force_unload_slot_scan"
  | "replace_material_scan"
  | "replace_slot_scan"

type PanasonicUnloadRecord = {
  slotIdno: string
  subSlotIdno?: string | null
  materialPackCode: string
  unfeedReason?: string | null
  operationTime: string
}

type PanasonicSpliceRecord = {
  slotIdno: string
  subSlotIdno?: string | null
  materialPackCode: string
  correctState: "true" | "warning"
  operationTime: string
}

type PanasonicCacheRow = {
  id?: number
  slotIdno?: string
  subSlotIdno?: string | null
  correct?: unknown
  operatorIdno?: string | null
  materialInventoryIdno?: string | null
  appendedMaterialInventoryIdno?: string | null
  firstAppendTime?: string | null
  remark?: string
}

type PanasonicCachePayload = {
  version: 1
  rows: PanasonicCacheRow[]
  unloadRecords?: PanasonicUnloadRecord[]
  spliceRecords?: PanasonicSpliceRecord[]
  ipqcRecords?: IpqcInspectionRecord[]
  materialInventoryResult?: {
    success: boolean
    materialInventory?: { idno: string; remark?: string } | null
    matchedRows?: { slotIdno: string; subSlotIdno?: string | null }[] | null
  } | null
  inputs?: {
    material?: string
    slot?: string
  }
}

const isUnloadMode = ref(false)
const isIpqcMode = ref(false)
const unloadModeType = ref<UnloadModeType>("pack_auto_slot")
const unloadReplacePhase = ref<UnloadReplacePhase>("unload_scan")
const unloadMaterialValue = ref("")
const unloadSlotValue = ref("")
const resolvedUnloadSlotIdno = ref("")
const replacementMaterialPackCode = ref("")
const replacementCorrectState = ref<"true" | "warning" | null>(null)
const pendingUnloadRecords = ref<PanasonicUnloadRecord[]>([])
const pendingSpliceRecords = ref<PanasonicSpliceRecord[]>([])

const ipqcMaterialValue = ref("")
const ipqcSlotValue = ref("")
const ipqcMaterialInput = ref<HTMLInputElement | null>(null)
const ipqcSlotInput = ref<HTMLInputElement | null>(null)
const ipqcSavedCorrectStates = ref<Map<string, CorrectState | null>>(new Map())
const pendingIpqcRecords = ref<IpqcInspectionRecord[]>([])

const operationModeName = computed(() => {
  if (isUnloadMode.value) {
    return unloadModeType.value === "force_single_slot"
      ? MATERIAL_FORCE_UNLOAD_MODE_NAME
      : MATERIAL_UNLOAD_MODE_NAME
  }
  if (isIpqcMode.value) return MATERIAL_IPQC_MODE_NAME
  return MATERIAL_FEED_MODE_NAME
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

const storageKey = computed(() => {
  if (typeof window === "undefined") return ""
  const mode = isTestingMode ? "testing" : "normal"
  return [
    "smt:panasonic:preproduction",
    workOrderIdno.value ?? "",
    productIdno.value ?? "",
    mounterIdno.value ?? "",
    machineSideQuery.value ?? "",
    workSheetSideQuery.value ?? "",
    mode,
  ].join("|")
})

function readCache(key: string): PanasonicCachePayload | null {
  if (typeof window === "undefined") return null
  if (!key) return null
  const raw = localStorage.getItem(key)
  if (!raw) return null
  try {
    return JSON.parse(raw) as PanasonicCachePayload
  } catch {
    return null
  }
}

function writeCache() {
  if (typeof window === "undefined") return
  if (!cacheEnabled.value) return
  if (!storageKey.value) return
  const cachedMaterialResult = materialInventoryResult.value
    ? {
        success: materialInventoryResult.value.success,
        materialInventory: materialInventoryResult.value.materialInventory
          ? {
              idno: materialInventoryResult.value.materialInventory.idno,
              remark: materialInventoryResult.value.materialInventory.remark,
            }
          : null,
        matchedRows: materialInventoryResult.value.matchedRows ?? null,
      }
    : null

  const payload: PanasonicCachePayload = {
    version: 1,
    rows: (rowData.value ?? []).map((row: any) => ({
      id: row.id,
      slotIdno: row.slotIdno,
      subSlotIdno: row.subSlotIdno ?? null,
      correct: row.correct ?? null,
      operatorIdno: row.operatorIdno ?? null,
      materialInventoryIdno: row.materialInventoryIdno ?? null,
      appendedMaterialInventoryIdno: row.appendedMaterialInventoryIdno ?? null,
      firstAppendTime: row.firstAppendTime ?? null,
      remark: row.remark ?? "",
    })),
    unloadRecords: pendingUnloadRecords.value,
    spliceRecords: pendingSpliceRecords.value,
    ipqcRecords: pendingIpqcRecords.value,
    materialInventoryResult: cachedMaterialResult,
    inputs: {
      material: materialInputValue.value,
      slot: slotInputValue.value,
    },
  }
  try {
    localStorage.setItem(storageKey.value, JSON.stringify(payload))
  } catch {
    return
  }
}

function clearCache() {
  if (typeof window === "undefined") return
  if (!storageKey.value) return
  localStorage.removeItem(storageKey.value)
}

function persistNow() {
  if (!readyToPersist.value) return
  if (!cacheEnabled.value) return
  writeCache()
}

function hydrateFromCache(key: string) {
  const cached = readCache(key)
  if (!cached) {
    hydratedKey.value = key
    return
  }

  const cachedById = new Map<number, PanasonicCacheRow>()
  const cachedBySlot = new Map<string, PanasonicCacheRow>()
  for (const row of cached.rows ?? []) {
    if (typeof row.id === "number") cachedById.set(row.id, row)
    if (row.slotIdno != null) {
      const key = `${row.slotIdno}-${row.subSlotIdno ?? ""}`
      cachedBySlot.set(key, row)
    }
  }

  const nextRows = (rowData.value ?? []).map((row: any) => {
    const rowKey = `${row.slotIdno}-${row.subSlotIdno ?? ""}`
    const cachedRow = cachedById.get(row.id) ?? cachedBySlot.get(rowKey)
    if (!cachedRow) return row
    const next = { ...row }
    if ("correct" in cachedRow) next.correct = cachedRow.correct ?? null
    if ("operatorIdno" in cachedRow) next.operatorIdno = cachedRow.operatorIdno ?? null
    if ("materialInventoryIdno" in cachedRow)
      next.materialInventoryIdno = cachedRow.materialInventoryIdno ?? null
    if ("appendedMaterialInventoryIdno" in cachedRow)
      next.appendedMaterialInventoryIdno =
        cachedRow.appendedMaterialInventoryIdno ?? ""
    if ("firstAppendTime" in cachedRow)
      next.firstAppendTime = cachedRow.firstAppendTime ?? null
    if ("remark" in cachedRow) next.remark = cachedRow.remark ?? ""
    return next
  })

  rowData.value = nextRows
  syncGridRows(nextRows)

  if ("materialInventoryResult" in cached) {
    materialInventoryResult.value = (cached.materialInventoryResult ?? null) as
      | SlotInputResult
      | null
  }

  if (cached.inputs) {
    materialInputValue.value = cached.inputs.material ?? ""
    slotInputValue.value = cached.inputs.slot ?? ""
  }

  if (cached.unloadRecords) {
    pendingUnloadRecords.value = cached.unloadRecords
  }

  if (cached.spliceRecords) {
    pendingSpliceRecords.value = cached.spliceRecords
  }

  if (cached.ipqcRecords) {
    pendingIpqcRecords.value = cached.ipqcRecords
  }

  hydratedKey.value = key
}

watch(
  [storageKey, () => rowData.value.length],
  ([key, len]) => {
    if (!key) return
    if (len <= 0) return
    if (hydratedKey.value === key) return
    hydrateFromCache(key)
    readyToPersist.value = true
  },
  { immediate: true }
)

watch(
  () => productionStarted.value,
  (started) => {
    if (!started) return
    cacheEnabled.value = false
    clearCache()
  }
)

watch(
  [
    () => rowData.value,
    materialInventoryResult,
    materialInputValue,
    slotInputValue,
    pendingUnloadRecords,
    pendingSpliceRecords,
    pendingIpqcRecords,
  ],
  () => {
    persistNow()
  },
  { deep: true }
)

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

  if (targetRow && existingMaterial && newPackCode) {
    const isMatched = materialInventoryResult.value?.matchedRows?.some(
      (r) =>
        r.slotIdno === payload.slot &&
        (r.subSlotIdno ?? "") === (payload.subSlot ?? "")
    )
    let correctState: "true" | "warning"
    if (isMatched || (isMockMode && !isTestingMode)) {
      correctState = "true"
    } else if (isTestingMode) {
      correctState = "warning"
    } else {
      showError(`料號不符：無法對站位 ${payload.slotIdno} 進行接料`)
      resetInputsAfterSlotSubmit()
      return
    }

    targetRow.appendedMaterialInventoryIdno = appendMaterialCode(
      targetRow.appendedMaterialInventoryIdno,
      newPackCode
    )
    targetRow.operatorIdno = currentUsername.value || null
    targetRow.firstAppendTime = targetRow.firstAppendTime ?? new Date().toISOString()
    if (correctState === "warning") targetRow.remark = "[測試模式接料]"
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
    return await handleSlotSubmitWithPolicy(payload)
  } finally {
    resetInputsAfterSlotSubmit()
    persistNow()
  }
}

async function onSubmitShortageWithPersist() {
  await onSubmitShortage()
  persistNow()
}

function parseAppendedCodes(value: string | null | undefined): string[] {
  const raw = String(value ?? "").trim()
  if (!raw) return []
  return raw
    .split(",")
    .map((code) => code.trim())
    .filter((code) => code.length > 0)
}

function toRowSlotIdno(row: PanasonicCacheRow): string {
  const slot = String(row.slotIdno ?? "").trim()
  const subSlot = String(row.subSlotIdno ?? "").trim()
  return subSlot ? `${slot}-${subSlot}` : slot
}

function toCanonicalPanasonicSlot(raw: string): string | null {
  const parsed = parsePanasonicSlotIdno(raw)
  if (!parsed) return null
  const slot = String(parsed.slot ?? "").trim()
  const subSlot = String(parsed.subSlot ?? "").trim().toUpperCase()
  if (!slot) return null
  return subSlot ? `${slot}-${subSlot}` : slot
}

function updateRowInGrid(row: PanasonicCacheRow) {
  try {
    gridApi.value?.applyTransaction?.({ update: [row as any] })
  } catch {
    // Grid might not be ready
  }
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

function findUniqueUnloadSlotByPackCode(materialPackCode: string) {
  const targetPackCode = materialPackCode.trim()
  if (!targetPackCode) {
    return {
      ok: false as const,
      error: "請先輸入物料條碼",
    }
  }

  const matchedRows = (rowData.value ?? []).filter((row: any) => {
    const inMain = String(row.materialInventoryIdno ?? "").trim() === targetPackCode
    const inAppended = parseAppendedCodes(row.appendedMaterialInventoryIdno).includes(
      targetPackCode
    )
    return inMain || inAppended
  })

  if (matchedRows.length === 0) {
    return {
      ok: false as const,
      error: `找不到料號 ${targetPackCode} 對應的站位`,
    }
  }

  if (matchedRows.length > 1) {
    const slots = matchedRows.map((row: any) => toRowSlotIdno(row)).join(", ")
    return {
      ok: false as const,
      error: `料號 ${targetPackCode} 對應多個站位：${slots}`,
    }
  }

  return {
    ok: true as const,
    row: matchedRows[0],
    slotIdno: toRowSlotIdno(matchedRows[0]),
  }
}

async function validateUnloadMaterialPackCode(materialPackCode: string): Promise<boolean> {
  const trimmed = materialPackCode.trim()
  if (!trimmed) {
    showError("請先輸入物料條碼")
    return false
  }

  if (isTestingMode || isMockMode) return true

  try {
    await SmtService.getMaterialInventoryForSmt({
      materialInventoryIdno: trimmed,
    })
    return true
  } catch (error) {
    showError(resolveMaterialLookupError(error))
    return false
  }
}

async function resolveReplacementCorrectState(params: {
  materialPackCode: string
  slotIdno: string
}): Promise<"true" | "warning" | null> {
  const materialPackCode = params.materialPackCode.trim()
  const slotIdno = params.slotIdno.trim()
  if (!materialPackCode) {
    showError("請先輸入物料條碼")
    return null
  }

  const row = findRowBySlotIdno(slotIdno)
  if (!row) {
    showError(`找不到槽位 ${slotIdno}`)
    return null
  }

  if (isMockMode && !isTestingMode) return "true"
  if (isTestingMode) return "warning"

  try {
    const materialInventory = await SmtService.getMaterialInventoryForSmt({
      materialInventoryIdno: materialPackCode,
    })
    const scannedMaterialId = String(materialInventory.material_idno ?? "").trim()
    const expectedMaterialId = String(row.materialIdno ?? "").trim()
    if (!scannedMaterialId || scannedMaterialId !== expectedMaterialId) {
      showError(`料號不符：站位 ${slotIdno} 應為 ${expectedMaterialId}`)
      return null
    }
    return "true"
  } catch (error) {
    showError(resolveMaterialLookupError(error))
    return null
  }
}

function resetUnloadFlowState(modeType: UnloadModeType = unloadModeType.value) {
  unloadModeType.value = modeType
  unloadReplacePhase.value =
    modeType === "force_single_slot" ? "force_unload_slot_scan" : "unload_scan"
  unloadMaterialValue.value = ""
  unloadSlotValue.value = ""
  resolvedUnloadSlotIdno.value = ""
  replacementMaterialPackCode.value = ""
  replacementCorrectState.value = null
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

function enterUnloadMode(modeType: UnloadModeType) {
  isUnloadMode.value = true
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
  focusMaterialInput()
}

function showIpqcColumns(visible: boolean) {
  columnApi.value?.setColumnVisible("inspectMaterialPackCode", visible)
  columnApi.value?.setColumnVisible("inspectTime", visible)
  columnApi.value?.setColumnVisible("inspectCount", visible)
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

function enterIpqcMode() {
  isIpqcMode.value = true
  if (isUnloadMode.value) exitUnloadMode()
  clearNormalScanState()

  // 儲存目前 correct 狀態，全部設為 ⛔
  const saved = new Map<string, CorrectState | null>()
  for (const row of rowData.value) {
    const key = `${row.slotIdno}-${row.subSlotIdno ?? ""}`
    saved.set(key, row.correct as CorrectState | null)
    row.correct = "unloaded"
    updateRowInGrid(row)
  }
  ipqcSavedCorrectStates.value = saved

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
      row.correct = saved
      updateRowInGrid(row)
    }
  }
  ipqcSavedCorrectStates.value.clear()
  showIpqcColumns(false)
  ipqcMaterialValue.value = ""
  ipqcSlotValue.value = ""
  focusMaterialInput()
}

function getCurrentPackCode(row: any): string {
  const appended = parseAppendedCodes(row.appendedMaterialInventoryIdno)
  if (appended.length > 0) return appended[appended.length - 1]
  return String(row.materialInventoryIdno ?? "").trim()
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
    handleModeTriggerFromNormalInput(code)
    ipqcMaterialValue.value = ""
    return
  }

  // ERP 驗證
  const isValid = await validateUnloadMaterialPackCode(materialPackCode)
  if (!isValid) {
    ipqcMaterialValue.value = ""
    focusIpqcMaterialInput()
    return
  }

  ipqcMaterialValue.value = materialPackCode
  focusIpqcSlotInput()
}

function handleIpqcSlotSubmit() {
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

  // 標記已巡檢 ✅
  row.correct = "true"
  row.inspectMaterialPackCode = materialPackCode
  row.inspectTime = new Date().toISOString()
  row.inspectCount = (row.inspectCount ?? 0) + 1
  updateRowInGrid(row)

  pendingIpqcRecords.value = [
    ...pendingIpqcRecords.value,
    {
      slotIdno: row.slotIdno,
      subSlotIdno: row.subSlotIdno ?? null,
      materialPackCode,
      inspectorIdno: currentUsername.value || "",
      inspectionTime: new Date().toISOString(),
    },
  ]

  ipqcSlotValue.value = ""
  ipqcMaterialValue.value = ""
  focusIpqcMaterialInput()
  persistNow()
}

function handleModeTriggerFromNormalInput(code: string): boolean {
  if (code === MATERIAL_UNLOAD_TRIGGER) {
    if (isIpqcMode.value) exitIpqcMode()
    enterUnloadMode("pack_auto_slot")
    return true
  }

  if (code === MATERIAL_FORCE_UNLOAD_TRIGGER) {
    if (isIpqcMode.value) exitIpqcMode()
    enterUnloadMode("force_single_slot")
    return true
  }

  if (code === MATERIAL_IPQC_TRIGGER) {
    isIpqcMode.value ? exitIpqcMode() : enterIpqcMode()
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

function pushUnloadRecord(record: PanasonicUnloadRecord) {
  pendingUnloadRecords.value = [...pendingUnloadRecords.value, record]
  persistNow()
}

function applyUnloadToRow(row: any, materialPackCode: string) {
  const inMain = String(row.materialInventoryIdno ?? "").trim() === materialPackCode
  const inAppended = parseAppendedCodes(row.appendedMaterialInventoryIdno).includes(
    materialPackCode
  )

  if (inMain) {
    row.materialInventoryIdno = ""
    row.correct = "unloaded"
  }

  if (inAppended) {
    row.appendedMaterialInventoryIdno = removeMaterialCode(
      row.appendedMaterialInventoryIdno,
      materialPackCode
    )
  }

  updateRowInGrid(row)
}

async function handleUnloadMaterialSubmit(materialPackCode: string) {
  const isValidPackCode = await validateUnloadMaterialPackCode(materialPackCode)
  if (!isValidPackCode) {
    unloadMaterialValue.value = ""
    focusUnloadMaterialInput()
    return
  }

  const resolved = findUniqueUnloadSlotByPackCode(materialPackCode)
  if (!resolved.ok || !resolved.row) {
    showError(resolved.error ?? "找不到對應槽位")
    unloadMaterialValue.value = ""
    focusUnloadMaterialInput()
    return
  }

  const operationTime = new Date().toISOString()
  pushUnloadRecord({
    slotIdno: resolved.row.slotIdno,
    subSlotIdno: resolved.row.subSlotIdno ?? null,
    materialPackCode,
    unfeedReason: "MATERIAL_FINISHED",
    operationTime,
  })

  applyUnloadToRow(resolved.row, materialPackCode)

  unloadMaterialValue.value = ""
  resolvedUnloadSlotIdno.value = resolved.slotIdno ?? ""
  unloadReplacePhase.value = "replace_material_scan"
  focusUnloadMaterialInput()
}

async function handleForceUnloadSlotSubmit(slotIdno: string) {
  const row = findRowBySlotIdno(slotIdno)
  if (!row) {
    showError(`找不到槽位 ${slotIdno}`)
    unloadSlotValue.value = ""
    focusUnloadSlotInput()
    return
  }

  const appendedCodes = parseAppendedCodes(row.appendedMaterialInventoryIdno)
  const preferredPackCode = appendedCodes[appendedCodes.length - 1]
  const mainPackCode = String(row.materialInventoryIdno ?? "").trim()
  const materialPackCode = String(preferredPackCode ?? mainPackCode).trim()

  if (!materialPackCode) {
    showError(`槽位 ${slotIdno} 無可卸除料號`)
    unloadSlotValue.value = ""
    focusUnloadSlotInput()
    return
  }

  const operationTime = new Date().toISOString()
  pushUnloadRecord({
    slotIdno: row.slotIdno,
    subSlotIdno: row.subSlotIdno ?? null,
    materialPackCode,
    unfeedReason: "WRONG_MATERIAL",
    operationTime,
  })

  applyUnloadToRow(row, materialPackCode)

  unloadSlotValue.value = ""
  resolvedUnloadSlotIdno.value = toRowSlotIdno(row)
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
    if (isForceUnloadSlotPhase.value) {
      focusUnloadSlotInput()
    } else {
      focusUnloadMaterialInput()
    }
    return
  }

  const correctState = await resolveReplacementCorrectState({
    materialPackCode,
    slotIdno: targetSlotIdno,
  })

  unloadMaterialValue.value = ""
  if (!correctState) {
    focusUnloadMaterialInput()
    return
  }

  replacementMaterialPackCode.value = materialPackCode
  replacementCorrectState.value = correctState
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
  const correctState = replacementCorrectState.value

  if (!slotIdno) {
    showError("請輸入站位")
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
    showError(`請掃描原卸料站位 ${targetSlotIdno}`)
    unloadSlotValue.value = ""
    focusUnloadSlotInput()
    return
  }

  if (!replacementPackCode || !correctState) {
    showError("找不到更換捲號，請重新掃描")
    unloadReplacePhase.value = "replace_material_scan"
    focusUnloadMaterialInput()
    return
  }

  const row = findRowBySlotIdno(targetSlotIdno)
  if (!row) {
    showError(`找不到槽位 ${targetSlotIdno}`)
    resetToInitialUnloadPhase()
    focusUnloadMaterialInput()
    return
  }

  row.materialInventoryIdno = replacementPackCode
  row.correct = correctState
  row.operatorIdno = currentUsername.value || null
  row.firstAppendTime = row.firstAppendTime ?? new Date().toISOString()
  if (correctState === "warning") {
    row.remark = "[測試模式綁定]"
  }

  updateRowInGrid(row)

  pendingSpliceRecords.value = [
    ...pendingSpliceRecords.value,
    {
      slotIdno: row.slotIdno,
      subSlotIdno: row.subSlotIdno ?? null,
      materialPackCode: replacementPackCode,
      correctState,
      operationTime: new Date().toISOString(),
    },
  ]
  persistNow()

  unloadSlotValue.value = ""
  exitUnloadMode()
}

function syncGridRows(rows: unknown[]) {
  if (!gridApi.value) {
    pendingGridSync.value = true
    return
  }
  gridApi.value.setRowData(rows as any)
}

function setAppendedColumnVisible(visible: boolean) {
  columnApi.value?.setColumnVisible("appendedMaterialInventoryIdno", visible)
}

function onGridReadyWithCache(e: GridReadyEvent) {
  gridApi.value = e.api
  columnApi.value = e.columnApi
  onGridReady(e)
  if (pendingGridSync.value) {
    pendingGridSync.value = false
    syncGridRows(rowData.value)
  }
  setAppendedColumnVisible(productionStarted.value)
}

watch(
  () => productionStarted.value,
  (started) => setAppendedColumnVisible(started)
)

function onUnloadUploaded(ok: boolean) {
  if (!ok) return
  pendingUnloadRecords.value = []
  persistNow()
}

function onIpqcUploaded(ok: boolean) {
  if (!ok) return
  pendingIpqcRecords.value = []
  persistNow()
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
