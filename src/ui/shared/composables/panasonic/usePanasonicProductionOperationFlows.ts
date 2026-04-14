import type { ComputedRef, Ref } from "vue"
import type { ColumnApi, GridApi } from "ag-grid-community"
import { type CheckMaterialMatchEnum } from "@/client"
import { parsePanasonicSlotIdno } from "@/domain/slot/PanasonicSlotParser"
import type { MounterProductionOperationFlowsAdapter } from "@/ui/shared/composables/core/MounterProductionOperationFlowsAdapter"
import { useMounterProductionOperationFlowsCore } from "@/ui/shared/composables/core/useMounterProductionOperationFlowsCore"

// Use only the public methods we actually call to avoid Vue's UnwrapRef stripping
// private class members from GridApi/ColumnApi, which would break Ref<T> assignability.
type GridApiRef   = Ref<Pick<GridApi,    "applyTransaction"> | null>
type ColumnApiRef = Ref<Pick<ColumnApi, "setColumnVisible"> | null>

// ─────────────────────────────────────────────────────────────────────────────
// Options（外部 API 不變）
// ─────────────────────────────────────────────────────────────────────────────

export type PanasonicProductionOperationFlowsOptions = {
  rowData:         Ref<any[]>
  gridApi:         GridApiRef
  columnApi:       ColumnApiRef
  currentUsername: ComputedRef<string | null>
  isTestingMode:   Ref<boolean>
  isMockMode:      boolean
  showError:               (msg: string) => void
  showSuccess:             (msg: string) => void
  handleUserSwitchTrigger: (code: string) => boolean
  clearNormalScanState:    () => void
  focusMaterialInput:      () => void
  // 即時 API（從 usePanasonicProductionPage 注入）
  submitUnload: (params: { materialPackCode: string; slotIdno: string }) => Promise<boolean>
  submitForceUnloadBySlot: (params: { slotIdno: string; unfeedReason?: string | null }) => Promise<{ ok: boolean; slotIdno?: string }>
  findUniqueUnloadSlotByPackCode: (materialPackCode: string) => { ok: true; slotIdno: string } | { ok: false; error: string }
  validateUnloadMaterialPackCode: (code: string) => Promise<boolean>
  validateReplacementMaterialForSlot: (params: { materialPackCode: string; slotIdno: string }) => Promise<boolean>
  submitReplace: (params: { materialPackCode: string; slotIdno: string }) => Promise<boolean>
  submitSplice: (params: { materialPackCode: string; slotIdno: string }) => Promise<boolean>
  fetchMaterialInventory: (code: string) => Promise<unknown>
  inspectionUpload: (params: {
    statId: number
    slotIdno: string
    subSlotIdno: string | null
    materialPackCode: string
    operatorIdno: string | null
    checkPackCodeMatch?: CheckMaterialMatchEnum | null
  }) => Promise<void>
}

// ─────────────────────────────────────────────────────────────────────────────
// Canonical slot normalisation（shared with slotsMatch）
// ─────────────────────────────────────────────────────────────────────────────

function toCanonicalPanasonicSlot(raw: string): string | null {
  const parsed = parsePanasonicSlotIdno(raw)
  if (!parsed) return null
  const slot    = String(parsed.slot    ?? "").trim()
  const subSlot = String(parsed.subSlot ?? "").trim().toUpperCase()
  if (!slot) return null
  return subSlot ? `${slot}-${subSlot}` : slot
}

// ─────────────────────────────────────────────────────────────────────────────
// Panasonic production adapter
// ─────────────────────────────────────────────────────────────────────────────

function buildPanasonicProductionAdapter(
  gridApi:         GridApiRef,
  columnApi:       ColumnApiRef,
  inspectionUpload: PanasonicProductionOperationFlowsOptions["inspectionUpload"],
): MounterProductionOperationFlowsAdapter {
  return {
    // ── Row keying ───────────────────────────────────────────────────────
    toRowKey: (row) => `${row.slotIdno}-${row.subSlotIdno ?? ""}`,
    toRowSlotIdno(row) {
      const slot    = String(row.slotIdno    ?? "").trim()
      const subSlot = String(row.subSlotIdno ?? "").trim()
      return subSlot ? `${slot}-${subSlot}` : slot
    },

    // ── Grid API ─────────────────────────────────────────────────────────
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

    // ── Slot parsing ─────────────────────────────────────────────────────
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

    // ── IPQC 即時上傳 ────────────────────────────────────────────────────
    async submitIpqcRow(row: any, materialPackCode: string, operatorIdno: string | null, checkPackCodeMatch?: CheckMaterialMatchEnum | null) {
      if (!row.id) return
      try {
        await inspectionUpload({
          statId: row.id,
          slotIdno:    String(row.slotIdno),
          subSlotIdno: row.subSlotIdno ?? null,
          materialPackCode,
          operatorIdno,
          checkPackCodeMatch,
        })
      } catch {
        // 失敗靜默處理（UI 已更新，與原實作一致）
      }
    },

    // Panasonic 特有：IPQC 後更新 row.remark
    afterIpqcRowUpdate(row: any) {
      row.remark = `巡檢 ${row.inspectCount ?? 1} 次`
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Thin wrapper
// ─────────────────────────────────────────────────────────────────────────────

export function usePanasonicProductionOperationFlows(options: PanasonicProductionOperationFlowsOptions) {
  const {
    rowData, gridApi, columnApi, currentUsername,
    isTestingMode, isMockMode,
    showError, showSuccess, handleUserSwitchTrigger,
    clearNormalScanState, focusMaterialInput,
    submitUnload, submitForceUnloadBySlot,
    findUniqueUnloadSlotByPackCode,
    validateUnloadMaterialPackCode,
    validateReplacementMaterialForSlot,
    submitReplace, submitSplice, fetchMaterialInventory, inspectionUpload,
  } = options

  const adapter = buildPanasonicProductionAdapter(gridApi, columnApi, inspectionUpload)

  return useMounterProductionOperationFlowsCore(
    {
      rowData,
      currentUsername,
      isTestingMode,
      isMockMode,
      showError,
      showSuccess,
      handleUserSwitchTrigger,
      clearNormalScanState,
      focusMaterialInput,
      fetchMaterialInventory,
      submitUnload,
      submitForceUnloadBySlot,
      findUniqueUnloadSlotByPackCode,
      validateUnloadMaterialPackCode,
      validateReplacementMaterialForSlot,
      submitReplace,
      submitSplice,
    },
    adapter,
  )
}
