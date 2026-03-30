import type { ComputedRef, Ref } from "vue"
import type { ColumnApi, GridApi } from "ag-grid-community"
import { parseFujiSlotIdno } from "@/domain/slot/FujiSlotParser"
import type { MaterialRepositoryResult } from "@/application/barcode-scan/BarcodeScanDeps"
import type { IpqcInspectionRecord } from "@/domain/mounter/ipqcTypes"
import type { MounterOperationFlowsAdapter } from "@/ui/shared/composables/core/MounterOperationFlowsAdapter"
import { useMounterOperationFlowsCore } from "@/ui/shared/composables/core/useMounterOperationFlowsCore"
import type {
  FujiPreproductionUnloadRecord,
  FujiPreproductionSpliceRecord,
} from "./fujiPreproductionDetailTypes"

// GridApi has private class members that break Ref<T> assignability, so we
// use a structural Pick of only the methods we actually call.
type FujiPreGridApi    = Pick<GridApi,    "applyTransaction">
type FujiPreColumnApi  = Pick<ColumnApi, "setColumnVisible">

// ────────────────────────────────────────────────────────────────
// Options（外部 API 不變）
// ────────────────────────────────────────────────────────────────

export type FujiPreproductionOperationFlowsOptions = {
  // Grid
  getGridApi:    () => FujiPreGridApi   | null
  getColumnApi:  () => FujiPreColumnApi | null
  // Data
  rowData:       Ref<any[]>
  mounterIdno:   ComputedRef<string>
  // User
  currentUsername: ComputedRef<string | null>
  // Mode
  isTestingMode: Ref<boolean>
  isMockMode:    boolean
  // Port（no @/client）
  fetchMaterialInventory: (id: string) => Promise<MaterialRepositoryResult>
  // UI callbacks
  showError:               (msg: string) => void
  handleUserSwitchTrigger: (code: string) => boolean
  clearNormalScanState:    () => void
  focusMaterialInput:      () => void
  persistNow:              () => void
  // Records
  pendingUnloadRecords: Ref<FujiPreproductionUnloadRecord[]>
  pendingSpliceRecords: Ref<FujiPreproductionSpliceRecord[]>
  pendingIpqcRecords:   Ref<IpqcInspectionRecord[]>
}

// ────────────────────────────────────────────────────────────────
// Fuji adapter builder
// ────────────────────────────────────────────────────────────────

function buildFujiPreproductionAdapter(
  getGridApi:   () => FujiPreGridApi   | null,
  getColumnApi: () => FujiPreColumnApi | null,
): MounterOperationFlowsAdapter {
  return {
    // ── Row keying ────────────────────────────────────────────────────────
    toRowKey(row: any): string {
      return `${row.mounterIdno}-${row.stage}-${row.slot}`
    },

    toRowSlotIdno(row: any): string {
      return `${row.mounterIdno}-${row.stage}-${row.slot}`
    },

    // ── Grid API ──────────────────────────────────────────────────────────
    applyGridTransaction(update: any[]) {
      try { getGridApi()?.applyTransaction?.({ update }) } catch { /* grid not ready */ }
    },

    setColumnVisible(colId: string, visible: boolean) {
      getColumnApi()?.setColumnVisible(colId, visible)
    },

    toggleNormalColumnsForIpqc(visible: boolean) {
      const api = getColumnApi()
      if (!api) return
      const normalCols = ["materialInventoryIdno", "operatorIdno", "operationTime"]
      normalCols.forEach(col => { try { api.setColumnVisible(col, !visible) } catch { /* no-op */ } })
    },

    // ── Slot parsing ──────────────────────────────────────────────────────
    findRowBySlotInput(slotIdno: string, rowData: any[]): any | null {
      const parsed = parseFujiSlotIdno(slotIdno)
      if (!parsed) return null
      return rowData.find(
        (row: any) =>
          Number(row.slot) === parsed.slot &&
          String(row.stage).trim() === String(parsed.stage).trim(),
      ) ?? null
    },

    slotsMatch(inputRaw: string, targetSlotIdno: string): boolean {
      const a = parseFujiSlotIdno(inputRaw)
      const b = parseFujiSlotIdno(targetSlotIdno)
      return !!(a && b && a.slot === b.slot && a.stage === b.stage)
    },

    // ── Record 組裝 ───────────────────────────────────────────────────────
    buildUnloadRecord(row: any, { materialPackCode, unfeedReason, operationTime }): FujiPreproductionUnloadRecord {
      return {
        slot:  row.slot  as number,
        stage: row.stage as string,
        materialPackCode,
        unfeedReason,
        operationTime,
      }
    },

    buildSpliceRecord(row: any, { materialPackCode, correctState, operationTime }): FujiPreproductionSpliceRecord {
      return {
        slot:  row.slot  as number,
        stage: row.stage as string,
        materialPackCode,
        correctState: correctState as FujiPreproductionSpliceRecord["correctState"],
        operationTime,
      }
    },

    buildIpqcRecord(_row: any, { slotIdno, materialPackCode, inspectorIdno, inspectionTime }): IpqcInspectionRecord {
      const parsed = parseFujiSlotIdno(slotIdno)
      return {
        slotIdno,
        stage: parsed?.stage ?? "",
        slot:  parsed?.slot  ?? 0,
        materialPackCode,
        inspectorIdno,
        inspectionTime,
      }
    },
  }
}

// ────────────────────────────────────────────────────────────────
// Thin wrapper
// ────────────────────────────────────────────────────────────────

export function useFujiPreproductionOperationFlows(options: FujiPreproductionOperationFlowsOptions) {
  const {
    getGridApi, getColumnApi,
    rowData, currentUsername, isTestingMode, isMockMode,
    fetchMaterialInventory, showError, handleUserSwitchTrigger,
    clearNormalScanState, focusMaterialInput, persistNow,
    pendingUnloadRecords, pendingSpliceRecords, pendingIpqcRecords,
    // mounterIdno は row.mounterIdno で取得するため core には不要
  } = options

  const adapter = buildFujiPreproductionAdapter(getGridApi, getColumnApi)

  return useMounterOperationFlowsCore(
    {
      rowData,
      currentUsername,
      isTestingMode,
      isMockMode,
      fetchMaterialInventory,
      showError,
      handleUserSwitchTrigger,
      clearNormalScanState,
      focusMaterialInput,
      persistNow,
      pendingUnloadRecords: pendingUnloadRecords as Ref<unknown[]>,
      pendingSpliceRecords:  pendingSpliceRecords  as Ref<unknown[]>,
      pendingIpqcRecords,
    },
    adapter,
  )
}
