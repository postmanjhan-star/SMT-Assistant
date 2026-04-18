import { computed } from "vue"
import type { Ref } from "vue"
import type { IpqcInspectionRecord } from "@/domain/mounter/ipqcTypes"
import type {
  FujiPreproductionUnloadRecord,
  FujiPreproductionSpliceRecord,
  FujiMaterialInventoryCache,
} from "./fujiPreproductionDetailTypes"
import type {
  BaseCachePayload,
  BaseCacheRow,
  PreproductionDetailCacheAdapter,
} from "../core/PreproductionDetailCacheAdapter"
import { usePreproductionDetailCacheCore } from "../core/usePreproductionDetailCacheCore"

type FujiCacheRow = BaseCacheRow & {
  mounterIdno: string
  stage: string
  slot: number
  appendedMaterialInventoryIdno?: string
  spliceMaterialInventoryIdno?: string | null
  operationTime?: string | null
}

interface FujiDetailCacheOptions<TRow extends FujiCacheRow = FujiCacheRow> {
  isTestingMode: Ref<boolean>
  workOrderIdno: Ref<string>
  productIdno: Ref<string>
  mounterIdno: Ref<string>
  boardSideQuery: Ref<string>
  testingProductIdno: Ref<string>
  rowData: Ref<TRow[]>
  materialInventory: Ref<{ id?: number | null; idno: string; material_id?: number | null; material_idno: string; material_name?: string } | null>
  materialInputValue: Ref<string>
  slotInputValue: Ref<string>
  pendingUnloadRecords: Ref<FujiPreproductionUnloadRecord[]>
  pendingSpliceRecords: Ref<FujiPreproductionSpliceRecord[]>
  pendingIpqcRecords: Ref<IpqcInspectionRecord[]>
  productionStarted: Ref<boolean>
  onHydrateRows: (rows: TRow[]) => void
}

export function useFujiDetailCache<TRow extends FujiCacheRow = FujiCacheRow>(options: FujiDetailCacheOptions<TRow>) {
  const {
    isTestingMode, workOrderIdno, productIdno, mounterIdno, boardSideQuery, testingProductIdno,
    rowData, materialInventory, materialInputValue, slotInputValue,
    pendingUnloadRecords, pendingSpliceRecords, pendingIpqcRecords, productionStarted,
    onHydrateRows,
  } = options

  const adapter: PreproductionDetailCacheAdapter<TRow> = {
    storageKey: computed(() => {
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
    }),

    serializeRow(row) {
      return {
        id: row.id,
        key: `${row.mounterIdno}-${row.stage}-${row.slot}`,
        correct: row.correct,
        operatorIdno: row.operatorIdno ?? null,
        materialInventoryIdno: row.materialInventoryIdno ?? null,
        appendedMaterialInventoryIdno: row.appendedMaterialInventoryIdno ?? undefined,
        spliceMaterialInventoryIdno: row.spliceMaterialInventoryIdno ?? null,
        operationTime: row.operationTime ?? null,
        remark: row.remark ?? "",
      }
    },

    serializeMaterialAsPayloadFields() {
      const v = materialInventory.value
      return {
        materialInventory: v
          ? {
              id: v.id ?? null,
              idno: v.idno,
              material_id: v.material_id ?? null,
              material_idno: v.material_idno,
              material_name: v.material_name ?? "",
            }
          : null,
      }
    },

    toAlternativeKey(cachedRow) {
      const key = cachedRow.key as string | undefined
      return typeof key === "string" ? key : null
    },

    toLiveRowAlternativeKey(row) {
      return `${row.mounterIdno}-${row.stage}-${row.slot}`
    },

    hydrateExtraFields(next, cachedRow) {
      if ("appendedMaterialInventoryIdno" in cachedRow)
        next.appendedMaterialInventoryIdno = (cachedRow.appendedMaterialInventoryIdno as string | undefined) ?? ""
      if ("spliceMaterialInventoryIdno" in cachedRow)
        next.spliceMaterialInventoryIdno = (cachedRow.spliceMaterialInventoryIdno as string | null | undefined) ?? null
      if ("operationTime" in cachedRow)
        next.operationTime = (cachedRow.operationTime as string | null | undefined) ?? null
    },

    hydrateMaterial(payload: BaseCachePayload) {
      if (!("materialInventory" in payload)) return
      const cached = payload.materialInventory as FujiMaterialInventoryCache | null
      materialInventory.value = cached
        ? {
            id: cached.id ?? null,
            idno: cached.idno,
            material_id: cached.material_id ?? null,
            material_idno: cached.material_idno,
            material_name: cached.material_name ?? "",
          }
        : null
    },
  }

  return usePreproductionDetailCacheCore(
    {
      rowData,
      materialRef: materialInventory as Ref<unknown>,
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
