import { computed } from "vue"
import type { ComputedRef, Ref } from "vue"
import type { ColumnApi, GridApi } from "ag-grid-community"
import { type CheckMaterialMatchEnum, type FujiMounterItemStatRead } from "@/client"
import { parseFujiSlotIdno } from "@/domain/slot/FujiSlotParser"
import { isFujiStatSlotMatch } from "@/domain/production/buildFujiProductionRowData"
import type { FujiProductionRowModel } from "@/domain/production/buildFujiProductionRowData"
import type { MounterProductionOperationFlowsAdapter } from "@/ui/shared/composables/core/MounterProductionOperationFlowsAdapter"
import { useMounterProductionOperationFlowsCore } from "@/ui/shared/composables/core/useMounterProductionOperationFlowsCore"

// GridApi has private class members that break Ref<T> assignability, so we
// use a structural Pick of only the methods we actually call.
type FujiGridApi   = Pick<GridApi,   "applyTransaction">
type FujiColumnApi = Pick<ColumnApi, "setColumnVisible">

// ────────────────────────────────────────────────────────────────
// Options（外部 API 不變）
// ────────────────────────────────────────────────────────────────

export type FujiOperationFlowsOptions = {
  // Grid
  getGridApi:    () => FujiGridApi   | null
  getColumnApi?: () => FujiColumnApi | null
  // Data
  rowData:      Ref<FujiProductionRowModel[]>
  mounterData:  Ref<FujiMounterItemStatRead[]>
  // Mode
  isTestingMode: Ref<boolean>
  isMockMode:    boolean
  currentUsername?: () => string | null
  // UI callbacks
  showError:               (msg: string) => void
  showSuccess:             (msg: string) => void
  handleUserSwitchTrigger: (code: string) => boolean
  clearNormalScanState:    () => void
  focusMaterialInput:      () => void
  // API functions（從 useFujiProductionWorkflow 注入）
  submitUnload:                   (params: { materialPackCode: string; slotIdno: string; unfeedReason?: string | null }) => Promise<boolean>
  submitForceUnloadBySlot:        (params: { slotIdno: string; unfeedReason?: string | null }) => Promise<{ ok: boolean; slotIdno?: string }>
  findUniqueUnloadSlotByPackCode: (materialPackCode: string) => { ok: true; slotIdno: string } | { ok: false; error: string }
  validateUnloadMaterialPackCode: (code: string) => Promise<boolean>
  validateReplacementMaterialForSlot: (params: { materialPackCode: string; slotIdno: string }) => Promise<boolean>
  submitReplace:    (params: { materialPackCode: string; slotIdno: string }) => Promise<boolean>
  submitSplice:     (params: { materialPackCode: string; slotIdno: string }) => Promise<boolean>
  fetchMaterialInventory: (code: string) => Promise<unknown>
  inspectionUpload: (params: {
    stat_id: number
    inputSlot: string
    inputSubSlot: string
    materialInventory: { idno: string }
    checkPackCodeMatch?: CheckMaterialMatchEnum | null
  }) => Promise<void>
  applyInspectionUpdate: (mounter: string, stage: string | null, slot: number | null, materialIdno: string) => void
}

// ────────────────────────────────────────────────────────────────
// Fuji production adapter
// ────────────────────────────────────────────────────────────────

function buildFujiProductionAdapter(
  getGridApi:    () => FujiGridApi   | null,
  getColumnApi:  (() => FujiColumnApi | null) | undefined,
  mounterData:   Ref<FujiMounterItemStatRead[]>,
  inspectionUpload: FujiOperationFlowsOptions["inspectionUpload"],
  applyInspectionUpdate: FujiOperationFlowsOptions["applyInspectionUpdate"],
): MounterProductionOperationFlowsAdapter<FujiProductionRowModel> {
  return {
    // ── Row keying ───────────────────────────────────────────────────────
    toRowKey: (row) => `${row.mounterIdno}-${row.stage}-${row.slot}`,
    toRowSlotIdno: (row) => `${row.mounterIdno}-${row.stage}-${row.slot}`,

    // ── Grid API ─────────────────────────────────────────────────────────
    applyGridTransaction(update) {
      try { getGridApi()?.applyTransaction?.({ update }) } catch { /* grid not ready */ }
    },

    setColumnVisible(colId: string, visible: boolean) {
      getColumnApi?.()?.setColumnVisible(colId, visible)
    },

    toggleNormalColumnsForIpqc(visible: boolean) {
      const api = getColumnApi?.()
      if (!api) return
      const normalCols = ["materialInventoryIdno", "operatorIdno", "operationTime"]
      normalCols.forEach(col => { try { api.setColumnVisible(col, !visible) } catch { /* no-op */ } })
    },

    // ── Slot parsing ─────────────────────────────────────────────────────
    findRowBySlotInput(slotIdno, rowData) {
      const parsed = parseFujiSlotIdno(slotIdno)
      if (!parsed) return null
      return rowData.find(
        (row) =>
          Number(row.slot) === parsed.slot &&
          String(row.stage).trim() === String(parsed.stage).trim(),
      ) ?? null
    },

    slotsMatch(inputRaw: string, targetSlotIdno: string): boolean {
      const a = parseFujiSlotIdno(inputRaw)
      const b = parseFujiSlotIdno(targetSlotIdno)
      return !!(a && b && a.slot === b.slot && a.stage === b.stage)
    },

    // ── IPQC 即時上傳 ────────────────────────────────────────────────────
    async submitIpqcRow(row, materialPackCode, _operatorIdno, checkPackCodeMatch) {
      const statItem = mounterData.value.find((s) =>
        isFujiStatSlotMatch(s, row.slot, row.stage)
      )
      if (!statItem) return
      try {
        await inspectionUpload({
          stat_id: statItem.id,
          inputSlot: String(row.slot),
          inputSubSlot: row.stage,
          materialInventory: { idno: materialPackCode },
          checkPackCodeMatch,
        })
        applyInspectionUpdate(row.mounterIdno, row.stage, row.slot, materialPackCode)
      } catch (error) {
        // inspectionUpload 失敗：UI 已更新，靜默處理（對齊原 catch(error) { showError } 行為）
        console.error("[Fuji IPQC upload]", error)
      }
    },
  }
}

// ────────────────────────────────────────────────────────────────
// Thin wrapper
// ────────────────────────────────────────────────────────────────

export function useFujiOperationFlows(options: FujiOperationFlowsOptions) {
  const {
    getGridApi, getColumnApi,
    rowData, mounterData,
    isTestingMode, isMockMode,
    showError, showSuccess, handleUserSwitchTrigger,
    clearNormalScanState, focusMaterialInput,
    submitUnload, submitForceUnloadBySlot,
    findUniqueUnloadSlotByPackCode,
    validateUnloadMaterialPackCode,
    validateReplacementMaterialForSlot,
    submitReplace, submitSplice, fetchMaterialInventory,
    inspectionUpload, applyInspectionUpdate,
  } = options

  const adapter = buildFujiProductionAdapter(
    getGridApi, getColumnApi, mounterData, inspectionUpload, applyInspectionUpdate,
  )

  const core = useMounterProductionOperationFlowsCore(
    {
      rowData,
      currentUsername: computed(() => options.currentUsername?.() ?? null),
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

  return {
    ...core,
    // Fuji 頁面使用 handleExitUnloadMode，core 提供 exitUnloadMode
    handleExitUnloadMode: core.exitUnloadMode,
  }
}
