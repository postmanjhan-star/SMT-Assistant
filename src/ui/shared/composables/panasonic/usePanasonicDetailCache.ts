import { computed, ref, watch } from "vue"
import type { ComputedRef, Ref } from "vue"
import type { SlotInputResult } from "@/pages/mounter/panasonic/types/production"
import type { IpqcInspectionRecord } from "@/domain/mounter/ipqcTypes"
import type {
  PanasonicCacheRow,
  PanasonicCachePayload,
  PanasonicUnloadRecord,
  PanasonicSpliceRecord,
} from "./panasonicDetailTypes"

interface PanasonicDetailCacheOptions {
  isTestingMode: boolean
  workOrderIdno: ComputedRef<string | null>
  productIdno: ComputedRef<string | null>
  mounterIdno: ComputedRef<string | null>
  machineSideQuery: ComputedRef<string | null>
  workSheetSideQuery: ComputedRef<string | null>
  rowData: Ref<any[]>
  materialInventoryResult: Ref<SlotInputResult | null>
  materialInputValue: Ref<string>
  slotInputValue: Ref<string>
  pendingUnloadRecords: Ref<PanasonicUnloadRecord[]>
  pendingSpliceRecords: Ref<PanasonicSpliceRecord[]>
  pendingIpqcRecords: Ref<IpqcInspectionRecord[]>
  productionStarted: Ref<boolean>
  onHydrateRows: (rows: any[]) => void
}

export function usePanasonicDetailCache(options: PanasonicDetailCacheOptions) {
  const {
    isTestingMode, workOrderIdno, productIdno, mounterIdno, machineSideQuery, workSheetSideQuery,
    rowData, materialInventoryResult, materialInputValue, slotInputValue,
    pendingUnloadRecords, pendingSpliceRecords, pendingIpqcRecords, productionStarted,
    onHydrateRows,
  } = options

  const cacheEnabled = ref(true)
  const hydratedKey = ref<string | null>(null)
  const readyToPersist = ref(false)

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
        const slotKey = `${row.slotIdno}-${row.subSlotIdno ?? ""}`
        cachedBySlot.set(slotKey, row)
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
        next.appendedMaterialInventoryIdno = cachedRow.appendedMaterialInventoryIdno ?? ""
      if ("firstAppendTime" in cachedRow)
        next.firstAppendTime = cachedRow.firstAppendTime ?? null
      if ("remark" in cachedRow) next.remark = cachedRow.remark ?? ""
      return next
    })

    rowData.value = nextRows
    onHydrateRows(nextRows)

    if ("materialInventoryResult" in cached) {
      materialInventoryResult.value = (cached.materialInventoryResult ?? null) as SlotInputResult | null
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
      materialInventoryResult,
      materialInputValue,
      slotInputValue,
      pendingUnloadRecords,
      pendingSpliceRecords,
      pendingIpqcRecords,
    ],
    () => { persistNow() },
    { deep: true }
  )

  return { cacheEnabled, persistNow, clearCache }
}
