<script setup lang="ts">
import "ag-grid-community/styles/ag-grid.css"
import "ag-grid-community/styles/ag-theme-balham.css"
import { AgGridVue } from "ag-grid-vue3"
import type { GridApi, GridReadyEvent } from "ag-grid-community"
import { NButton, NGi } from "naive-ui"
import { ref, computed, watch } from "vue"
import { useMeta } from "vue-meta"
import { useRoute } from "vue-router"

import MaterialInventoryBarcodeInput from "@/pages/components/MaterialInventoryBarcodeInput.vue"
import SlotIdnoInput from "@/pages/components/SlotIdnoInput.vue"
import FujiMounterLayout from "@/pages/components/fuji/FujiMounterLayout.vue"
import FujiMounterHeader from "@/pages/components/fuji/FujiMounterHeader.vue"
import { parseFujiSlotInput } from "@/domain/slot/FujiSlotParser"
import { useFujiDetailPage } from "@/ui/workflows/preproduction/fuji/composables/useFujiDetailPage"
import { createMockScan, MOCK_SCAN_ENABLED } from "@/dev/createMockScan"

useMeta({ title: "Fuji Mounter Assistant" })

type FujiCacheRow = {
  id?: number
  key?: string
  correct?: unknown
  operatorIdno?: string | null
  materialInventoryIdno?: string | null
  remark?: string
}

type FujiCachePayload = {
  version: 1
  rows: FujiCacheRow[]
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
const effectiveScan = import.meta.env.DEV && (MOCK_SCAN_ENABLED || route.query.mock_scan === '1')
  ? createMockScan()
  : undefined

const slotIdnoInput = ref<{ focus: () => void } | null>(null)
const materialInputValue = ref("")
const slotInputValue = ref("")
const cacheEnabled = ref(true)
const hydratedKey = ref<string | null>(null)
const readyToPersist = ref(false)
const gridApi = ref<GridApi | null>(null)
const pendingGridSync = ref(false)

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
  handleSlotSubmit,
  showError,
} = useFujiDetailPage({
  focusSlotInput: () => slotIdnoInput.value?.focus(),
})

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
      remark: row.remark ?? "",
    })),
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
  [() => rowData.value, materialInventory, materialInputValue, slotInputValue],
  () => {
    persistNow()
  },
  { deep: true }
)

function onMaterialMatched(payload: Parameters<typeof handleMaterialMatched>[0]) {
  handleMaterialMatched(payload)
  persistNow()
}

function onMaterialError(message: string) {
  handleMaterialError(message)
  persistNow()
}

async function onSlotSubmit(payload: Parameters<typeof handleSlotSubmit>[0]) {
  const result = await handleSlotSubmit(payload)
  persistNow()
  return result
}

function syncGridRows(rows: unknown[]) {
  if (!gridApi.value) {
    pendingGridSync.value = true
    return
  }
  gridApi.value.setRowData(rows as any)
}

function onGridReadyWithCache(e: GridReadyEvent) {
  gridApi.value = e.api
  onGridReady(e)
  if (pendingGridSync.value) {
    pendingGridSync.value = false
    syncGridRows(rowData.value)
  }
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
        <template #actions>
          <n-button v-if="!productionStarted" type="success" size="small" @click="onProduction">
            🚀 開始生產
          </n-button>
          <n-button v-else type="error" size="small" @click="onStopProduction">
            🛑 結束生產
          </n-button>
        </template>
      </FujiMounterHeader>
    </template>

    <template #inputs>
      <n-gi>
        <MaterialInventoryBarcodeInput
          v-model="materialInputValue"
          :disabled="productionStarted"
          :is-testing-mode="isTestingMode"
          :get-material-matched-rows="getMaterialMatchedRows"
          :reset-key="materialResetKey"
          :scan="effectiveScan ?? scanMaterial"
          :allow-no-match-in-testing="true"
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

    <ag-grid-vue
      class="ag-theme-balham-dark"
      :rowData="rowData"
      style="height: 100%"
      :gridOptions="gridOptions"
      @grid-ready="onGridReadyWithCache"
    />
  </FujiMounterLayout>
</template>

<style>
.ag-cell-wrapper {
  height: 100%;
}
</style>
