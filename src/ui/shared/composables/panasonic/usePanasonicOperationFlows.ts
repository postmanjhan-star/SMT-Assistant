import { computed } from "vue"
import type { ComputedRef, Ref } from "vue"
import type { ColumnApi, GridApi } from "ag-grid-community"
import type { MaterialRepositoryResult } from "@/application/barcode-scan/BarcodeScanDeps"
import type { IpqcInspectionRecord } from "@/domain/mounter/ipqcTypes"
import { appendMaterialCode } from "@/domain/production/PostProductionFeedRules"
import { parsePanasonicSlotIdno } from "@/domain/slot/PanasonicSlotParser"
import { useMounterOperationFlowsCore } from "@/ui/shared/composables/core/useMounterOperationFlowsCore"
import type { MounterOperationFlowsAdapter } from "@/ui/shared/composables/core/MounterOperationFlowsAdapter"
import type { PanasonicUnloadRecord, PanasonicSpliceRecord } from "./panasonicDetailTypes"

// Use only the public methods we actually call to avoid Vue's UnwrapRef stripping
// private class members from GridApi/ColumnApi, which would break Ref<T> assignability.
type GridApiRef   = Ref<Pick<GridApi,    "applyTransaction"> | null>
type ColumnApiRef = Ref<Pick<ColumnApi, "setColumnVisible"> | null>

// ─────────────────────────────────────────────────────────────────────────────
// Options（外部 API 不變）
// ─────────────────────────────────────────────────────────────────────────────

interface PanasonicOperationFlowsOptions {
  rowData:         Ref<any[]>
  gridApi:         GridApiRef
  columnApi:       ColumnApiRef
  currentUsername: ComputedRef<string | null>
  isTestingMode:   boolean
  isMockMode:      boolean
  fetchMaterialInventory: (id: string) => Promise<MaterialRepositoryResult>
  showError:              (msg: string) => void
  handleUserSwitchTrigger: (code: string) => boolean
  clearNormalScanState: () => void
  focusMaterialInput:   () => void
  persistNow:           () => void
  pendingUnloadRecords: Ref<PanasonicUnloadRecord[]>
  pendingSpliceRecords: Ref<PanasonicSpliceRecord[]>
  pendingIpqcRecords:   Ref<IpqcInspectionRecord[]>
}

// ─────────────────────────────────────────────────────────────────────────────
// Panasonic adapter builder
// ─────────────────────────────────────────────────────────────────────────────

function toCanonicalPanasonicSlot(raw: string): string | null {
  const parsed = parsePanasonicSlotIdno(raw)
  if (!parsed) return null
  const slot    = String(parsed.slot    ?? "").trim()
  const subSlot = String(parsed.subSlot ?? "").trim().toUpperCase()
  if (!slot) return null
  return subSlot ? `${slot}-${subSlot}` : slot
}

function buildPanasonicAdapter(gridApi: GridApiRef, columnApi: ColumnApiRef): MounterOperationFlowsAdapter {
  return {
    // ── Row keying ──────────────────────────────────────────────────────────
    toRowKey(row: any): string {
      return `${row.slotIdno}-${row.subSlotIdno ?? ""}`
    },

    toRowSlotIdno(row: any): string {
      const slot    = String(row.slotIdno    ?? "").trim()
      const subSlot = String(row.subSlotIdno ?? "").trim()
      return subSlot ? `${slot}-${subSlot}` : slot
    },

    // ── Grid API ────────────────────────────────────────────────────────────
    applyGridTransaction(update: any[]) {
      try { gridApi.value?.applyTransaction?.({ update }) } catch { /* grid not ready */ }
    },

    setColumnVisible(colId: string, visible: boolean) {
      columnApi.value?.setColumnVisible(colId, visible)
    },

    toggleNormalColumnsForIpqc(visible: boolean) {
      const api = columnApi.value
      if (!api) return
      const normalCols = ["materialInventoryIdno", "operatorIdno", "operationTime"]
      normalCols.forEach(col => { try { api.setColumnVisible(col, !visible) } catch { /* no-op */ } })
    },

    // ── Slot parsing ────────────────────────────────────────────────────────
    findRowBySlotInput(slotIdno: string, rowData: any[]): any | null {
      const parsed = parsePanasonicSlotIdno(slotIdno)
      if (!parsed) return null
      return rowData.find(
        (row: any) =>
          String(row.slotIdno    ?? "").trim() === String(parsed.slot    ?? "").trim() &&
          String(row.subSlotIdno ?? "").trim() === String(parsed.subSlot ?? "").trim(),
      ) ?? null
    },

    slotsMatch(inputRaw: string, targetSlotIdno: string): boolean {
      const a = toCanonicalPanasonicSlot(inputRaw)
      const b = toCanonicalPanasonicSlot(targetSlotIdno)
      return !!(a && b && a === b)
    },

    // ── Record builders ─────────────────────────────────────────────────────
    buildUnloadRecord(row: any, { materialPackCode, unfeedReason, operationTime, checkPackCodeMatch }): PanasonicUnloadRecord {
      return {
        slotIdno:     row.slotIdno,
        subSlotIdno:  row.subSlotIdno ?? null,
        materialPackCode,
        unfeedReason,
        operationTime,
        checkPackCodeMatch: checkPackCodeMatch ?? null,
      }
    },

    buildSpliceRecord(row: any, { materialPackCode, correctState, operationTime }): PanasonicSpliceRecord {
      return {
        slotIdno:     row.slotIdno,
        subSlotIdno:  row.subSlotIdno ?? null,
        materialPackCode,
        correctState: correctState as PanasonicSpliceRecord["correctState"],
        operationTime,
      }
    },

    buildIpqcRecord(_row: any, { slotIdno, materialPackCode, inspectorIdno, inspectionTime, checkPackCodeMatch }): IpqcInspectionRecord {
      return {
        slotIdno:      _row.slotIdno,
        subSlotIdno:   _row.subSlotIdno ?? null,
        materialPackCode,
        inspectorIdno,
        inspectionTime,
        checkPackCodeMatch: checkPackCodeMatch ?? null,
      }
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Thin wrapper
// ─────────────────────────────────────────────────────────────────────────────

export function usePanasonicOperationFlows(options: PanasonicOperationFlowsOptions) {
  const { gridApi, columnApi, isTestingMode: isTestingModeRaw, ...rest } = options

  // 正規化 plain boolean → Ref<boolean>
  const isTestingMode = computed(() => isTestingModeRaw)

  const adapter = buildPanasonicAdapter(gridApi, columnApi)

  const core = useMounterOperationFlowsCore(
    {
      ...rest,
      isTestingMode,
      pendingUnloadRecords: options.pendingUnloadRecords as Ref<unknown[]>,
      pendingSpliceRecords: options.pendingSpliceRecords as Ref<unknown[]>,
    },
    adapter,
  )

  // Panasonic-only: 供 .vue 的 onSlotSubmit 使用，避免直接 import domain
  function appendMaterialCodeToRow(currentValue: string, packCode: string) {
    return appendMaterialCode(currentValue, packCode)
  }

  return {
    ...core,
    appendMaterialCodeToRow,
  }
}
