import { computed, ref, watch } from "vue"
import type { Ref } from "vue"
import type { IpqcInspectionRecord } from "@/domain/mounter/ipqcTypes"
import type {
  FujiPreproductionCacheRow,
  FujiPreproductionCachePayload,
  FujiPreproductionUnloadRecord,
  FujiPreproductionSpliceRecord,
  FujiMaterialInventoryCache,
} from "./fujiPreproductionDetailTypes"

interface FujiDetailCacheOptions {
  isTestingMode: Ref<boolean>
  workOrderIdno: Ref<string>
  productIdno: Ref<string>
  mounterIdno: Ref<string>
  boardSideQuery: Ref<string>
  testingProductIdno: Ref<string>
  rowData: Ref<any[]>
  materialInventory: Ref<{ id?: number | null; idno: string; material_id?: number | null; material_idno: string; material_name?: string } | null>
  materialInputValue: Ref<string>
  slotInputValue: Ref<string>
  pendingUnloadRecords: Ref<FujiPreproductionUnloadRecord[]>
  pendingSpliceRecords: Ref<FujiPreproductionSpliceRecord[]>
  pendingIpqcRecords: Ref<IpqcInspectionRecord[]>
  productionStarted: Ref<boolean>
  onHydrateRows: (rows: any[]) => void
}

export function useFujiDetailCache(options: FujiDetailCacheOptions) {
  const {
    isTestingMode, workOrderIdno, productIdno, mounterIdno, boardSideQuery, testingProductIdno,
    rowData, materialInventory, materialInputValue, slotInputValue,
    pendingUnloadRecords, pendingSpliceRecords, pendingIpqcRecords, productionStarted,
    onHydrateRows,
  } = options

  const cacheEnabled = ref(true)
  const hydratedKey = ref<string | null>(null)
  const readyToPersist = ref(false)

  function toRowKey(row: any): string {
    return `${row.mounterIdno}-${row.stage}-${row.slot}`
  }

  const storageKey = computed(() => {
    if (typeof window === "undefined") return ""
    const mode = isTestingMode.value ? "testing" : "normal"
    return [
      "smt:fuji:preproduction",
      workOrderIdno.value,
      productIdno.value,
      mounterIdno.value,
      boardSideQuery.value,
      mode,
      testingProductIdno.value,
    ].join("|")
  })

  function readCache(key: string): FujiPreproductionCachePayload | null {
    if (typeof window === "undefined") return null
    if (!key) return null
    const raw = localStorage.getItem(key)
    if (!raw) return null
    try {
      return JSON.parse(raw) as FujiPreproductionCachePayload
    } catch {
      return null
    }
  }

  function writeCache() {
    if (typeof window === "undefined") return
    if (!cacheEnabled.value) return
    if (!storageKey.value) return
    const cachedMaterial: FujiMaterialInventoryCache | null = materialInventory.value
      ? {
          id: materialInventory.value.id ?? null,
          idno: materialInventory.value.idno,
          material_id: materialInventory.value.material_id ?? null,
          material_idno: materialInventory.value.material_idno,
          material_name: materialInventory.value.material_name ?? "",
        }
      : null

    const payload: FujiPreproductionCachePayload = {
      version: 1,
      rows: (rowData.value ?? []).map((row: any): FujiPreproductionCacheRow => ({
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
      ipqcRecords: pendingIpqcRecords.value,
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

    const cachedById = new Map<number, FujiPreproductionCacheRow>()
    const cachedByKey = new Map<string, FujiPreproductionCacheRow>()
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
    onHydrateRows(nextRows)

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

    if (cached.unloadRecords) pendingUnloadRecords.value = cached.unloadRecords
    if (cached.spliceRecords) pendingSpliceRecords.value = cached.spliceRecords
    if (cached.ipqcRecords) pendingIpqcRecords.value = cached.ipqcRecords

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
      pendingIpqcRecords,
    ],
    () => { persistNow() },
    { deep: true }
  )

  return { persistNow, cacheEnabled, clearCache }
}
