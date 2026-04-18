import type { ComputedRef, Ref } from "vue"
import type { CheckMaterialMatchEnum } from "@/client"
import type { MaterialRepositoryResult } from "@/application/barcode-scan/BarcodeScanDeps"
import type { IpqcInspectionRecord } from "@/domain/mounter/ipqcTypes"

// ─────────────────────────────────────────────────────────────────────────────
// 最小 row 形狀：materialPackCodeHelpers / coordinators 會直接存取的屬性
// ─────────────────────────────────────────────────────────────────────────────

export type OperationFlowRow = {
  correct?: string | null
  slotIdno: string
  subSlotIdno?: string | null
  materialIdno?: string
  materialInventoryIdno?: string | null
  appendedMaterialInventoryIdno?: string
  spliceMaterialInventoryIdno?: string | null
  // IPQC 巡檢欄位
  inspectMaterialPackCode?: string | null
  inspectTime?: string | null
  inspectCount?: number | null
  inspectorIdno?: string | null
  // 操作記錄欄位
  operatorIdno?: string | null
  operationTime?: string | null
  remark?: string | null
}

/**
 * 品牌特定行為介面。核心 composable 只透過此介面呼叫品牌邏輯，
 * 不直接 import 任何品牌 domain（FujiSlotParser、PanasonicSlotParser 等）。
 */
export interface MounterOperationFlowsAdapter<TRow extends OperationFlowRow = OperationFlowRow> {
  // ── Row keying ─────────────────────────────────────────────────────
  /** IPQC 儲存/恢復 Map 的 key */
  toRowKey(row: TRow): string
  /** machine.onUnloadSubmitted / onForceUnloadSubmitted 傳入的字串 */
  toRowSlotIdno(row: TRow): string

  // ── Grid / Column API ──────────────────────────────────────────────
  /** 呼叫 gridApi.applyTransaction({ update }) */
  applyGridTransaction(update: TRow[]): void
  /** 呼叫 columnApi.setColumnVisible */
  setColumnVisible(colId: string, visible: boolean): void
  /** 進入/退出 IPQC 模式時，隱藏或顯示格線特定的一般欄位（materialInventoryIdno、operatorIdno、operationTime）*/
  toggleNormalColumnsForIpqc?(visible: boolean): void

  // ── Slot parsing ───────────────────────────────────────────────────
  /** 依掃描輸入找到對應的 row，找不到回傳 null */
  findRowBySlotInput(slotIdno: string, rowData: TRow[]): TRow | null
  /** 比對「輸入站位」與「目標站位」是否相符（replace slot 確認用） */
  slotsMatch(inputRaw: string, targetSlotIdno: string): boolean

  // ── Record 組裝 ────────────────────────────────────────────────────
  buildUnloadRecord(
    row: TRow,
    params: { materialPackCode: string; unfeedReason: string; operationTime: string; checkPackCodeMatch?: CheckMaterialMatchEnum | null },
  ): unknown

  buildSpliceRecord(
    row: TRow,
    params: { materialPackCode: string; correctState: string; operationTime: string },
  ): unknown

  buildIpqcRecord(
    row: TRow,
    params: { slotIdno: string; materialPackCode: string; inspectorIdno: string; inspectionTime: string; checkPackCodeMatch?: CheckMaterialMatchEnum | null },
  ): IpqcInspectionRecord

}

// ─────────────────────────────────────────────────────────────────────────────
// Core options（共用，品牌無關）
// ─────────────────────────────────────────────────────────────────────────────

export interface MounterOperationFlowsCoreOptions<TRow extends OperationFlowRow = OperationFlowRow> {
  rowData: Ref<TRow[]>
  currentUsername: ComputedRef<string | null>
  /** wrapper 負責把 plain boolean 正規化為 Ref<boolean> */
  isTestingMode: Ref<boolean>
  isMockMode: boolean
  fetchMaterialInventory: (id: string) => Promise<MaterialRepositoryResult>
  showError: (msg: string) => void
  handleUserSwitchTrigger: (code: string) => boolean
  clearNormalScanState: () => void
  focusMaterialInput: () => void
  persistNow: () => void
  /** 使用 unknown[] 讓核心不 import 品牌特定 record 型別 */
  pendingUnloadRecords: Ref<unknown[]>
  pendingSpliceRecords: Ref<unknown[]>
  pendingIpqcRecords: Ref<IpqcInspectionRecord[]>
}
