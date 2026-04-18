import { ref, watch } from "vue"
import type {
  BaseCachePayload,
  BaseCacheRow,
  PreproductionDetailCacheAdapter,
  PreproductionDetailCacheCoreOptions,
} from "./PreproductionDetailCacheAdapter"

export function usePreproductionDetailCacheCore<TRow extends BaseCacheRow = BaseCacheRow>(
  options: PreproductionDetailCacheCoreOptions<TRow>,
  adapter: PreproductionDetailCacheAdapter<TRow>,
) {
  const {
    rowData, materialRef, materialInputValue, slotInputValue,
    pendingUnloadRecords, pendingSpliceRecords, pendingIpqcRecords,
    productionStarted, onHydrateRows,
  } = options

  const storageKey = adapter.storageKey
  const cacheEnabled = ref(true)
  const hydratedKey = ref<string | null>(null)
  const readyToPersist = ref(false)
  const writesSuspended = ref(false)

  function readCache(key: string): BaseCachePayload | null {
    if (typeof window === "undefined") return null
    if (!key) return null
    const raw = localStorage.getItem(key)
    if (!raw) return null
    try {
      return JSON.parse(raw) as BaseCachePayload
    } catch {
      return null
    }
  }

  function writeCache() {
    if (typeof window === "undefined") return
    if (!cacheEnabled.value) return
    if (!storageKey.value) return
    const payload: BaseCachePayload = {
      version: 1,
      rows: (rowData.value ?? []).map((r) => adapter.serializeRow(r)),
      unloadRecords: pendingUnloadRecords.value,
      spliceRecords: pendingSpliceRecords.value,
      ipqcRecords: pendingIpqcRecords.value,
      ...adapter.serializeMaterialAsPayloadFields(),
      inputs: { material: materialInputValue.value, slot: slotInputValue.value },
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
    if (writesSuspended.value) return
    writeCache()
  }

  function suspendWrite() { writesSuspended.value = true }
  function resumeWrite()  { writesSuspended.value = false }

  function hydrateFromCache(key: string) {
    const cached = readCache(key)
    if (!cached) {
      hydratedKey.value = key
      return
    }

    type CachedRow = ReturnType<PreproductionDetailCacheAdapter["serializeRow"]>
    const cachedById = new Map<number, CachedRow>()
    const cachedByAlt = new Map<string, CachedRow>()
    for (const row of cached.rows ?? []) {
      const r = row as CachedRow
      if (typeof r.id === "number") cachedById.set(r.id, r)
      const altKey = adapter.toAlternativeKey(r)
      if (altKey != null) cachedByAlt.set(altKey, r)
    }

    const nextRows = (rowData.value ?? []).map((row) => {
      const cachedRow = cachedById.get(row.id) ?? cachedByAlt.get(adapter.toLiveRowAlternativeKey(row))
      if (!cachedRow) return row
      const next = { ...row }
      if ("correct" in cachedRow) next.correct = cachedRow.correct ?? null
      if ("operatorIdno" in cachedRow) next.operatorIdno = cachedRow.operatorIdno ?? null
      if ("materialInventoryIdno" in cachedRow)
        next.materialInventoryIdno = cachedRow.materialInventoryIdno ?? null
      if ("remark" in cachedRow) next.remark = cachedRow.remark ?? ""
      adapter.hydrateExtraFields(next, cachedRow)
      return next
    })

    rowData.value = nextRows
    onHydrateRows(nextRows)
    adapter.hydrateMaterial(cached)

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
    { immediate: true },
  )

  watch(
    () => productionStarted.value,
    (started) => {
      if (!started) return
      cacheEnabled.value = false
      clearCache()
    },
  )

  watch(
    [
      () => rowData.value,
      materialRef,
      materialInputValue,
      slotInputValue,
      pendingUnloadRecords,
      pendingSpliceRecords,
      pendingIpqcRecords,
    ],
    () => {
      persistNow()
    },
    { deep: true },
  )

  return { cacheEnabled, persistNow, clearCache, suspendWrite, resumeWrite }
}
