<script setup lang="ts">
import "ag-grid-community/styles/ag-grid.css"
import "ag-grid-community/styles/ag-theme-balham.css"
import { AgGridVue } from "ag-grid-vue3"
import type { GridApi, GridReadyEvent } from "ag-grid-community"
import { NButton, NGi, NTag } from "naive-ui"
import { ref, computed, watch, nextTick } from "vue"
import { useMeta } from "vue-meta"
import { useRoute } from "vue-router"

import MaterialInventoryBarcodeInput from "@/pages/components/MaterialInventoryBarcodeInput.vue"
import SlotIdnoInput from "@/pages/components/SlotIdnoInput.vue"
import FujiMounterLayout from "@/pages/components/fuji/FujiMounterLayout.vue"
import FujiMounterHeader from "@/pages/components/fuji/FujiMounterHeader.vue"
import { parseFujiSlotIdno, parseFujiSlotInput } from "@/domain/slot/FujiSlotParser"
import { useFujiDetailPage } from "@/ui/workflows/preproduction/fuji/composables/useFujiDetailPage"
import type { FujiUnloadRecord } from "@/ui/workflows/preproduction/fuji/composables/useFujiPreproductionLifecycle"
import { createMockScan, MOCK_SCAN_ENABLED } from "@/dev/createMockScan"
import { CheckMaterialMatchEnum, SmtService } from "@/client"
import { appendMaterialCode } from "@/domain/production/PostProductionFeedRules"
import type { FujiSpliceRecord } from "@/ui/workflows/preproduction/fuji/composables/useFujiPreproductionLifecycle"
import { resolveMaterialLookupError } from "@/domain/material/MaterialLookupError"

useMeta({ title: "Fuji Mounter Assistant" })

const MATERIAL_UNLOAD_TRIGGER = "S5555"
const MATERIAL_FORCE_UNLOAD_TRIGGER = "S5577"
const MATERIAL_IPQC_TRIGGER = "S5588"
const MATERIAL_UNLOAD_MODE_NAME = "🔄換料卸除"
const MATERIAL_FORCE_UNLOAD_MODE_NAME = "⏏️單站卸除"
const MATERIAL_IPQC_MODE_NAME = "🔍IPQC覆檢"
const MATERIAL_FEED_MODE_NAME = "📥上料接料"

type UnloadModeType = "pack_auto_slot" | "force_single_slot"
type UnloadReplacePhase =
  | "unload_scan"
  | "force_unload_slot_scan"
  | "replace_material_scan"
  | "replace_slot_scan"

type FujiCacheRow = {
  id?: number
  key?: string
  correct?: unknown
  operatorIdno?: string | null
  materialInventoryIdno?: string | null
  appendedMaterialInventoryIdno?: string
  remark?: string
}

type FujiCachePayload = {
  version: 1
  rows: FujiCacheRow[]
  unloadRecords?: FujiUnloadRecord[]
  spliceRecords?: FujiSpliceRecord[]
  materialInventory?: {
    id?: number | null
    idno: string
    material_id?: number | null
    material_idno: string
    material_name?: string
  } | null
  inputs?: {
    material?: string
    slot?: string
  }
}

const route = useRoute()
const effectiveScan =
  import.meta.env.DEV && (MOCK_SCAN_ENABLED || route.query.mock_scan === "1")
    ? createMockScan()
    : undefined

const slotIdnoInput = ref<{ focus: () => void } | null>(null)
const materialInventoryInput = ref<{ focus?: () => void; clear?: () => void } | null>(null)
const unloadMaterialInput = ref<HTMLInputElement | null>(null)
const unloadSlotInput = ref<HTMLInputElement | null>(null)
const materialInputValue = ref("")
const slotInputValue = ref("")
const cacheEnabled = ref(true)
const hydratedKey = ref<string | null>(null)
const readyToPersist = ref(false)
const gridApi = ref<GridApi | null>(null)
const pendingGridSync = ref(false)

const isUnloadMode = ref(false)
const isIpqcMode = ref(false)
const unloadModeType = ref<UnloadModeType>("pack_auto_slot")
const unloadReplacePhase = ref<UnloadReplacePhase>("unload_scan")
const unloadMaterialValue = ref("")
const unloadSlotValue = ref("")
const resolvedUnloadSlot = ref<{ slot: number; stage: string } | null>(null)
const replacementMaterialPackCode = ref("")
const replacementCorrectState = ref<CheckMaterialMatchEnum | null>(null)
const pendingUnloadRecords = ref<FujiUnloadRecord[]>([])
const pendingSpliceRecords = ref<FujiSpliceRecord[]>([])

const {
  workOrderIdno,
  productIdno,
  boardSide,
  mounterIdno,
  isTestingMode,
  currentUsername,
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
})

// ─── Computed ────────────────────────────────────────────────────────────────

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

const resolvedUnloadSlotIdno = computed(() => {
  if (!resolvedUnloadSlot.value) return ""
  const { slot, stage } = resolvedUnloadSlot.value
  return `${mounterIdno.value}-${stage}-${slot}`
})

const unloadSlotPlaceholder = computed(() => {
  if (isForceUnloadSlotPhase.value) return "請掃描要卸除的站位"
  if (isReplaceSlotPhase.value) return `請掃描原卸料站位 ${resolvedUnloadSlotIdno.value}`
  return "請先掃描更換捲號"
})

// ─── Cache ────────────────────────────────────────────────────────────────────

const storageKey = computed(() => {
  if (typeof window === "undefined") return ""
  const testingProductValue = route.query.testing_product_idno
  const testingProductIdno = Array.isArray(testingProductValue)
    ? String(testingProductValue[0] ?? "")
    : String(testingProductValue ?? "")
  const mode = isTestingMode.value ? "testing" : "normal"
  return [
    "smt:fuji:preproduction",
    workOrderIdno.value ?? "",
    productIdno.value ?? "",
    mounterIdno.value ?? "",
    boardSide.value ?? "",
    mode,
    testingProductIdno,
  ].join("|")
})

function toRowKey(row: any) {
  return `${row.mounterIdno}-${row.stage}-${row.slot}`
}

function readCache(key: string): FujiCachePayload | null {
  if (typeof window === "undefined") return null
  if (!key) return null
  const raw = localStorage.getItem(key)
  if (!raw) return null
  try {
    return JSON.parse(raw) as FujiCachePayload
  } catch {
    return null
  }
}

function writeCache() {
  if (typeof window === "undefined") return
  if (!cacheEnabled.value) return
  if (!storageKey.value) return
  const cachedMaterial = materialInventory.value
    ? {
        id: materialInventory.value.id ?? null,
        idno: materialInventory.value.idno,
        material_id: materialInventory.value.material_id ?? null,
        material_idno: materialInventory.value.material_idno,
        material_name: materialInventory.value.material_name ?? "",
      }
    : null

  const payload: FujiCachePayload = {
    version: 1,
    rows: (rowData.value ?? []).map((row: any) => ({
      id: row.id,
      key: toRowKey(row),
      correct: row.correct,
      operatorIdno: row.operatorIdno ?? null,
      materialInventoryIdno: row.materialInventoryIdno ?? null,
      appendedMaterialInventoryIdno: row.appendedMaterialInventoryIdno ?? undefined,
      remark: row.remark ?? "",
    })),
    unloadRecords: pendingUnloadRecords.value,
    spliceRecords: pendingSpliceRecords.value,
    materialInventory: cachedMaterial,
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

  const cachedById = new Map<number, FujiCacheRow>()
  const cachedByKey = new Map<string, FujiCacheRow>()
  for (const row of cached.rows ?? []) {
    if (typeof row.id === "number") cachedById.set(row.id, row)
    if (row.key) cachedByKey.set(row.key, row)
  }

  const nextRows = (rowData.value ?? []).map((row: any) => {
    const cachedRow = cachedById.get(row.id) ?? cachedByKey.get(toRowKey(row))
    if (!cachedRow) return row
    const next = { ...row }
    if ("correct" in cachedRow) next.correct = cachedRow.correct ?? null
    if ("operatorIdno" in cachedRow) next.operatorIdno = cachedRow.operatorIdno ?? null
    if ("materialInventoryIdno" in cachedRow)
      next.materialInventoryIdno = cachedRow.materialInventoryIdno ?? null
    if ("appendedMaterialInventoryIdno" in cachedRow)
      next.appendedMaterialInventoryIdno = cachedRow.appendedMaterialInventoryIdno
    if ("remark" in cachedRow) next.remark = cachedRow.remark ?? ""
    return next
  })

  rowData.value = nextRows
  syncGridRows(nextRows)

  if ("materialInventory" in cached) {
    materialInventory.value = cached.materialInventory
      ? {
          id: cached.materialInventory.id ?? null,
          idno: cached.materialInventory.idno,
          material_id: cached.materialInventory.material_id ?? null,
          material_idno: cached.materialInventory.material_idno,
          material_name: cached.materialInventory.material_name ?? "",
        }
      : null
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
    materialInventory,
    materialInputValue,
    slotInputValue,
    pendingUnloadRecords,
    pendingSpliceRecords,
  ],
  () => {
    persistNow()
  },
  { deep: true }
)

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

  if (targetRow && existingMaterial && newPackCode) {
    const scannedMaterialId = String(currentMaterial?.material_idno ?? "").trim()
    const expectedMaterialId = String(targetRow.materialIdno ?? "").trim()

    let correctState: CheckMaterialMatchEnum
    if (scannedMaterialId && scannedMaterialId === expectedMaterialId) {
      correctState = CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK
    } else if (isTestingMode.value) {
      correctState = CheckMaterialMatchEnum.TESTING_MATERIAL_PACK
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

    targetRow.appendedMaterialInventoryIdno = appendMaterialCode(
      targetRow.appendedMaterialInventoryIdno,
      newPackCode
    )
    targetRow.operatorIdno = currentUsername.value || null
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
  persistNow()
  return result
}

// ─── Grid helpers ─────────────────────────────────────────────────────────────

function syncGridRows(rows: unknown[]) {
  if (!gridApi.value) {
    pendingGridSync.value = true
    return
  }
  gridApi.value.setRowData(rows as any)
}

function updateRowInGrid(row: any) {
  try {
    gridApi.value?.applyTransaction?.({ update: [row] })
  } catch {
    // Grid might not be ready
  }
}

function onGridReadyWithCache(e: GridReadyEvent) {
  gridApi.value = e.api
  onGridReady(e)
  if (pendingGridSync.value) {
    pendingGridSync.value = false
    syncGridRows(rowData.value)
  }
}

// ─── Unload mode helpers ──────────────────────────────────────────────────────

function toRowSlotIdno(row: any): string {
  return `${row.mounterIdno}-${row.stage}-${row.slot}`
}

function findRowBySlotIdno(slotIdno: string) {
  const parsed = parseFujiSlotIdno(slotIdno)
  if (!parsed) return null
  return (rowData.value ?? []).find(
    (row: any) =>
      Number(row.slot) === parsed.slot && String(row.stage).trim() === String(parsed.stage).trim()
  )
}

function findUniqueUnloadSlotByPackCode(materialPackCode: string) {
  const targetPackCode = materialPackCode.trim()
  if (!targetPackCode) {
    return { ok: false as const, error: "請先輸入物料條碼" }
  }

  const matchedRows = (rowData.value ?? []).filter(
    (row: any) => String(row.materialInventoryIdno ?? "").trim() === targetPackCode
  )

  if (matchedRows.length === 0) {
    return { ok: false as const, error: `找不到料號 ${targetPackCode} 對應的站位` }
  }

  if (matchedRows.length > 1) {
    const slots = matchedRows.map((row: any) => toRowSlotIdno(row)).join(", ")
    return { ok: false as const, error: `料號 ${targetPackCode} 對應多個站位：${slots}` }
  }

  return {
    ok: true as const,
    row: matchedRows[0],
    slot: matchedRows[0].slot as number,
    stage: matchedRows[0].stage as string,
  }
}

async function validateUnloadMaterialPackCode(materialPackCode: string): Promise<boolean> {
  const trimmed = materialPackCode.trim()
  if (!trimmed) {
    showError("請先輸入物料條碼")
    return false
  }

  if (isTestingMode.value) return true

  try {
    await SmtService.getMaterialInventoryForSmt({ materialInventoryIdno: trimmed })
    return true
  } catch (error) {
    showError(resolveMaterialLookupError(error))
    return false
  }
}

async function resolveReplacementCorrectState(params: {
  materialPackCode: string
  slot: number
  stage: string
}): Promise<CheckMaterialMatchEnum | null> {
  const materialPackCode = params.materialPackCode.trim()
  if (!materialPackCode) {
    showError("請先輸入物料條碼")
    return null
  }

  const row = (rowData.value ?? []).find(
    (r: any) => Number(r.slot) === params.slot && String(r.stage).trim() === params.stage
  )
  if (!row) {
    showError(`找不到槽位 ${mounterIdno.value}-${params.stage}-${params.slot}`)
    return null
  }

  if (isTestingMode.value) return CheckMaterialMatchEnum.TESTING_MATERIAL_PACK

  try {
    const materialInventoryData = await SmtService.getMaterialInventoryForSmt({
      materialInventoryIdno: materialPackCode,
    })
    const scannedMaterialId = String(materialInventoryData.material_idno ?? "").trim()
    const expectedMaterialId = String(row.materialIdno ?? "").trim()
    if (!scannedMaterialId || scannedMaterialId !== expectedMaterialId) {
      showError(
        `料號不符：站位 ${mounterIdno.value}-${params.stage}-${params.slot} 應為 ${expectedMaterialId}`
      )
      return null
    }
    return CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK
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
  resolvedUnloadSlot.value = null
  replacementMaterialPackCode.value = ""
  replacementCorrectState.value = null
}

function focusUnloadMaterialInput() {
  nextTick(() => unloadMaterialInput.value?.focus())
}

function focusUnloadSlotInput() {
  nextTick(() => unloadSlotInput.value?.focus())
}

function focusMaterialInput() {
  nextTick(() => materialInventoryInput.value?.focus?.())
}

function clearNormalScanState() {
  materialInputValue.value = ""
  slotInputValue.value = ""
  resetMaterialState()
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

function enterIpqcMode() {
  isIpqcMode.value = true
  if (isUnloadMode.value) exitUnloadMode()
}

function exitIpqcMode() {
  isIpqcMode.value = false
  focusMaterialInput()
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
    isIpqcMode.value ? exitIpqcMode() : enterIpqcMode()
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

async function handleBeforeMaterialScan(barcode: string): Promise<boolean> {
  const code = barcode.trim().toUpperCase()
  return !handleModeTriggerFromNormalInput(code)
}

function pushUnloadRecord(record: FujiUnloadRecord) {
  pendingUnloadRecords.value = [...pendingUnloadRecords.value, record]
  persistNow()
}

function applyUnloadToRow(row: any, materialPackCode: string) {
  if (String(row.materialInventoryIdno ?? "").trim() === materialPackCode) {
    row.materialInventoryIdno = ""
    row.correct = null
  }
  updateRowInGrid(row)
}

async function handleUnloadMaterialSubmit(materialPackCode: string) {
  const isValid = await validateUnloadMaterialPackCode(materialPackCode)
  if (!isValid) {
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

  pushUnloadRecord({
    slot: resolved.slot,
    stage: resolved.stage,
    materialPackCode,
    unfeedReason: "MATERIAL_FINISHED",
    operationTime: new Date().toISOString(),
  })

  applyUnloadToRow(resolved.row, materialPackCode)

  unloadMaterialValue.value = ""
  resolvedUnloadSlot.value = { slot: resolved.slot, stage: resolved.stage }
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

  const materialPackCode = String(row.materialInventoryIdno ?? "").trim()
  if (!materialPackCode) {
    showError(`槽位 ${slotIdno} 無可卸除料號`)
    unloadSlotValue.value = ""
    focusUnloadSlotInput()
    return
  }

  pushUnloadRecord({
    slot: row.slot as number,
    stage: row.stage as string,
    materialPackCode,
    unfeedReason: "WRONG_MATERIAL",
    operationTime: new Date().toISOString(),
  })

  applyUnloadToRow(row, materialPackCode)

  unloadSlotValue.value = ""
  resolvedUnloadSlot.value = { slot: row.slot as number, stage: row.stage as string }
  unloadReplacePhase.value = "replace_material_scan"
  focusUnloadMaterialInput()
}

function resetToInitialUnloadPhase() {
  unloadReplacePhase.value =
    unloadModeType.value === "force_single_slot" ? "force_unload_slot_scan" : "unload_scan"
}

async function handleReplacementMaterialSubmit(materialPackCode: string) {
  const target = resolvedUnloadSlot.value
  if (!target) {
    showError("找不到卸料站位，請重新掃描")
    resetToInitialUnloadPhase()
    unloadMaterialValue.value = ""
    focusUnloadMaterialInput()
    return
  }

  const correctState = await resolveReplacementCorrectState({
    materialPackCode,
    slot: target.slot,
    stage: target.stage,
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

  if (handleModeTriggerFromUnloadInput(material.toUpperCase())) return

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
  if (!slotIdno) {
    showError("請輸入站位")
    focusUnloadSlotInput()
    return
  }

  if (handleModeTriggerFromUnloadInput(slotIdno.toUpperCase())) return

  if (isForceUnloadSlotPhase.value) {
    void handleForceUnloadSlotSubmit(slotIdno)
    return
  }

  if (!isReplaceSlotPhase.value) {
    focusUnloadSlotInput()
    return
  }

  const target = resolvedUnloadSlot.value
  const parsedInput = parseFujiSlotIdno(slotIdno)
  if (
    !parsedInput ||
    !target ||
    parsedInput.slot !== target.slot ||
    parsedInput.stage !== target.stage
  ) {
    showError(`請掃描原卸料站位 ${resolvedUnloadSlotIdno.value}`)
    unloadSlotValue.value = ""
    focusUnloadSlotInput()
    return
  }

  const replacementPackCode = replacementMaterialPackCode.value.trim()
  const correctState = replacementCorrectState.value
  if (!replacementPackCode || !correctState) {
    showError("找不到更換捲號，請重新掃描")
    unloadReplacePhase.value = "replace_material_scan"
    focusUnloadMaterialInput()
    return
  }

  const row = (rowData.value ?? []).find(
    (r: any) => Number(r.slot) === target.slot && String(r.stage).trim() === target.stage
  )
  if (!row) {
    showError(`找不到槽位 ${resolvedUnloadSlotIdno.value}`)
    resetToInitialUnloadPhase()
    focusUnloadMaterialInput()
    return
  }

  row.materialInventoryIdno = replacementPackCode
  row.correct = correctState
  row.operatorIdno = currentUsername.value || null
  if (correctState === CheckMaterialMatchEnum.TESTING_MATERIAL_PACK) {
    row.remark = "[測試模式綁定]"
  }
  updateRowInGrid(row)
  persistNow()

  unloadSlotValue.value = ""
  exitUnloadMode()
}
</script>

<template>
  <FujiMounterLayout>
    <template #header>
      <FujiMounterHeader
        :mounter-idno="mounterIdno"
        :is-testing-mode="isTestingMode"
        :work-order-idno="workOrderIdno"
        :product-idno="productIdno"
        :board-side="boardSide"
        :operator-name="currentUsername"
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
.ag-cell-wrapper {
  height: 100%;
}
</style>
