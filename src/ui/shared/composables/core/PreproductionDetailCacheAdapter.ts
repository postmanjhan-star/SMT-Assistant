import type { ComputedRef, Ref } from "vue"
import type { IpqcInspectionRecord } from "@/domain/mounter/ipqcTypes"

/**
 * cache row 的最小公因子欄位（兩個品牌共有）。
 * 品牌特有欄位（Panasonic 的 slotIdno/firstAppendTime、Fuji 的 key）
 * 透過 `& Record<string, unknown>` 擴充。
 */
export interface BaseCacheRow {
  id?: number
  correct?: unknown
  operatorIdno?: string | null
  materialInventoryIdno?: string | null
  remark?: string
}

export interface BaseCachePayload {
  version: 1
  rows: BaseCacheRow[]
  unloadRecords?: unknown[]
  spliceRecords?: unknown[]
  ipqcRecords?: IpqcInspectionRecord[]
  inputs?: { material?: string; slot?: string }
  [key: string]: unknown
}

/**
 * 品牌特定序列化/反序列化介面。核心 composable 只透過此介面操作品牌邏輯，
 * 不直接 import 任何品牌 domain 型別。
 */
export interface PreproductionDetailCacheAdapter {
  /** localStorage 鍵值（computed），包含品牌 prefix 與所有查詢維度 */
  storageKey: ComputedRef<string>

  /**
   * 序列化單一 row 至 cache。
   * Panasonic 含 slotIdno/subSlotIdno/firstAppendTime；
   * Fuji 含 key（mounterIdno-stage-slot 三元組）。
   */
  serializeRow(row: any): BaseCacheRow & Record<string, unknown>

  /**
   * 序列化品牌 material 為 payload 欄位（spread 進 BaseCachePayload）。
   * Panasonic 回傳 `{ materialInventoryResult: {...} }`；
   * Fuji 回傳 `{ materialInventory: {...} }`。
   */
  serializeMaterialAsPayloadFields(): Record<string, unknown>

  /**
   * 從 cached row 取出後備 key（id 比對失敗時使用）。
   * Panasonic: `${slotIdno}-${subSlotIdno ?? ""}`；
   * Fuji: `cachedRow.key`（三元組字串）。
   * 回傳 null 表示此 row 不支援後備比對。
   */
  toAlternativeKey(cachedRow: BaseCacheRow & Record<string, unknown>): string | null

  /**
   * 從 live row 計算後備 key，格式需與 toAlternativeKey 一致。
   * Panasonic: `${row.slotIdno}-${row.subSlotIdno ?? ""}`；
   * Fuji: `${row.mounterIdno}-${row.stage}-${row.slot}`。
   */
  toLiveRowAlternativeKey(row: any): string

  /**
   * hydrate 時合併品牌特有欄位（共用欄位由 core 負責）。
   * Panasonic 合併 appendedMaterialInventoryIdno（帶 fallback ""）與 firstAppendTime；
   * Fuji 合併 appendedMaterialInventoryIdno（無 fallback）。
   */
  hydrateExtraFields(next: any, cachedRow: BaseCacheRow & Record<string, unknown>): void

  /**
   * 把 payload 內的 material 欄位寫回品牌特有的 Ref。
   * Panasonic 寫回 materialInventoryResult.value；
   * Fuji 寫回 materialInventory.value。
   */
  hydrateMaterial(payload: BaseCachePayload): void
}

// ─────────────────────────────────────────────────────────────────────────────
// Core options（共用，品牌無關）
// ─────────────────────────────────────────────────────────────────────────────

export interface PreproductionDetailCacheCoreOptions {
  rowData: Ref<any[]>
  /** 品牌的 material ref，作為 WatchSource 納入 persist watcher */
  materialRef: Ref<unknown>
  materialInputValue: Ref<string>
  slotInputValue: Ref<string>
  /** 使用 unknown[] 讓核心不 import 品牌特定 record 型別 */
  pendingUnloadRecords: Ref<unknown[]>
  pendingSpliceRecords: Ref<unknown[]>
  pendingIpqcRecords: Ref<IpqcInspectionRecord[]>
  productionStarted: Ref<boolean>
  onHydrateRows: (rows: any[]) => void
}
