import { computed } from "vue"
import type { ComputedRef, Ref } from "vue"
import type { SlotInputResult } from "@/pages/mounter/panasonic/types/production"
import type { IpqcInspectionRecord } from "@/domain/mounter/ipqcTypes"
import type { PanasonicUnloadRecord, PanasonicSpliceRecord } from "./panasonicDetailTypes"
import type {
  BaseCachePayload,
  PreproductionDetailCacheAdapter,
} from "../core/PreproductionDetailCacheAdapter"
import { usePreproductionDetailCacheCore } from "../core/usePreproductionDetailCacheCore"

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

  const adapter: PreproductionDetailCacheAdapter = {
    storageKey: computed(() => {
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
    }),

    serializeRow(row: any) {
      return {
        id: row.id,
        slotIdno: row.slotIdno,
        subSlotIdno: row.subSlotIdno ?? null,
        correct: row.correct ?? null,
        operatorIdno: row.operatorIdno ?? null,
        materialInventoryIdno: row.materialInventoryIdno ?? null,
        appendedMaterialInventoryIdno: row.appendedMaterialInventoryIdno ?? null,
        firstAppendTime: row.firstAppendTime ?? null,
        remark: row.remark ?? "",
      }
    },

    serializeMaterialAsPayloadFields() {
      const v = materialInventoryResult.value
      return {
        materialInventoryResult: v
          ? {
              success: v.success,
              materialInventory: v.materialInventory
                ? { idno: v.materialInventory.idno, remark: v.materialInventory.remark }
                : null,
              matchedRows: v.matchedRows ?? null,
            }
          : null,
      }
    },

    toAlternativeKey(cachedRow) {
      const slotIdno = cachedRow.slotIdno as string | null | undefined
      if (slotIdno == null) return null
      return `${slotIdno}-${(cachedRow.subSlotIdno as string | null | undefined) ?? ""}`
    },

    toLiveRowAlternativeKey(row: any) {
      return `${row.slotIdno}-${row.subSlotIdno ?? ""}`
    },

    hydrateExtraFields(next: any, cachedRow) {
      if ("appendedMaterialInventoryIdno" in cachedRow)
        next.appendedMaterialInventoryIdno = (cachedRow.appendedMaterialInventoryIdno as string | null | undefined) ?? ""
      if ("firstAppendTime" in cachedRow)
        next.firstAppendTime = (cachedRow.firstAppendTime as string | null | undefined) ?? null
    },

    hydrateMaterial(payload: BaseCachePayload) {
      if ("materialInventoryResult" in payload)
        materialInventoryResult.value = (payload.materialInventoryResult ?? null) as SlotInputResult | null
    },
  }

  return usePreproductionDetailCacheCore(
    {
      rowData,
      materialRef: materialInventoryResult as Ref<unknown>,
      materialInputValue,
      slotInputValue,
      pendingUnloadRecords: pendingUnloadRecords as Ref<unknown[]>,
      pendingSpliceRecords: pendingSpliceRecords as Ref<unknown[]>,
      pendingIpqcRecords,
      productionStarted,
      onHydrateRows,
    },
    adapter,
  )
}
