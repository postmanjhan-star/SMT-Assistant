import type { Ref } from "vue"
import type { OperationFlowRow } from "../MounterOperationFlowsAdapter"

// ─────────────────────────────────────────────────────────────────────────────
// 共用的 correct state 常數（與後端 CheckMaterialMatchEnum 值一致）
// ─────────────────────────────────────────────────────────────────────────────

export const CORRECT_STATE = {
  MATCHED:  "MATCHED_MATERIAL_PACK",
  TESTING:  "TESTING_MATERIAL_PACK",
  UNLOADED: "UNLOADED",
} as const

export type MaterialPackCodeHelperDeps<TRow extends OperationFlowRow = OperationFlowRow> = {
  isIpqcMode: Ref<boolean>
  rowData: Ref<TRow[]>
  toRowSlotIdno: (row: TRow) => string
}

export function createMaterialPackCodeHelpers<TRow extends OperationFlowRow = OperationFlowRow>(deps: MaterialPackCodeHelperDeps<TRow>) {
  const { isIpqcMode, rowData, toRowSlotIdno } = deps

  function getLoadedPackCode(row: TRow): string {
    const appended = String(row.appendedMaterialInventoryIdno ?? "").trim()
    if (appended) return appended
    if (!isIpqcMode.value && row.correct === CORRECT_STATE.UNLOADED) return ""
    return String(row.materialInventoryIdno ?? "").trim()
  }

  function getSplicePackCode(row: TRow): string {
    return String(row.spliceMaterialInventoryIdno ?? "").trim()
  }

  function getCurrentPackCode(row: TRow): string {
    return getSplicePackCode(row) || getLoadedPackCode(row)
  }

  function getForceUnloadPackCode(row: TRow): string | null {
    const code =
      getSplicePackCode(row) ||
      getLoadedPackCode(row) ||
      String(row.materialInventoryIdno ?? "").trim()
    return code || null
  }

  function rowMatchesPackCode(row: TRow, targetPackCode: string): boolean {
    return getLoadedPackCode(row) === targetPackCode || getSplicePackCode(row) === targetPackCode
  }

  function isBarcodeAlreadyInGrid(barcode: string): boolean {
    return rowData.value.some((row) => {
      if (getLoadedPackCode(row) === barcode) return true
      return getSplicePackCode(row) === barcode
    })
  }

  function findUniqueUnloadSlotByPackCode(materialPackCode: string) {
    const targetPackCode = materialPackCode.trim()
    if (!targetPackCode) return { ok: false as const, error: "請先輸入物料條碼" }

    const matchedRows = (rowData.value ?? []).filter((row) =>
      rowMatchesPackCode(row, targetPackCode)
    )

    if (matchedRows.length === 0) {
      return { ok: false as const, error: `找不到料號 ${targetPackCode} 對應的站位` }
    }
    if (matchedRows.length > 1) {
      const slots = matchedRows.map((r) => toRowSlotIdno(r)).join(", ")
      return { ok: false as const, error: `料號 ${targetPackCode} 對應多個站位：${slots}` }
    }
    return { ok: true as const, row: matchedRows[0], slotIdno: toRowSlotIdno(matchedRows[0]) }
  }

  return {
    getLoadedPackCode,
    getSplicePackCode,
    getCurrentPackCode,
    getForceUnloadPackCode,
    rowMatchesPackCode,
    isBarcodeAlreadyInGrid,
    findUniqueUnloadSlotByPackCode,
  }
}

export type MaterialPackCodeHelpers<TRow extends OperationFlowRow = OperationFlowRow> = ReturnType<typeof createMaterialPackCodeHelpers<TRow>>
