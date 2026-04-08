import { nextTick } from "vue"
import type { Ref } from "vue"
import type { ProductionRowModel } from "@/domain/production/buildPanasonicRowData"
import type { PanasonicSpliceRecord } from "@/ui/shared/composables/panasonic/panasonicDetailTypes"

type MaterialMatchedRow = {
  slotIdno: string
  subSlotIdno?: string | null
}

type MaterialInventoryResult = {
  success: boolean
  materialInventory?: { idno: string } | null
  matchedRows?: MaterialMatchedRow[] | null
} | null

export type PanasonicDetailSlotSubmitOptions = {
  splicePreviewCorrectStates: Ref<Map<string, string | null>>
  rowData: Ref<ProductionRowModel[]>
  isSpliceMode: Ref<boolean>
  isTestingMode: Ref<boolean> | boolean
  isMockMode: boolean
  getMaterialInventoryResult: () => MaterialInventoryResult
  getCurrentUsername: () => string | null
  findRowBySlotIdno: (slotIdno: string) => ProductionRowModel | undefined
  updateRowInGrid: (row: ProductionRowModel) => void
  onMaterialMatchedBase: (payload: {
    materialInventory: { idno: string } | null | undefined
    matchedRows: unknown[]
  }) => void
  handleSlotSubmitWithPolicy: (payload: {
    slotIdno: string
    slot: string
    subSlot: string
  }) => Promise<any>
  persistNow: () => void
  suspendWrite: () => void
  resumeWrite: () => void
  resetInputsAfterSlotSubmit: () => void
  showError: (message: string) => void
  pendingSpliceRecords: Ref<PanasonicSpliceRecord[]>
}

export function usePanasonicDetailSlotSubmit(options: PanasonicDetailSlotSubmitOptions) {
  function isTestingModeValue(): boolean {
    return typeof options.isTestingMode === "boolean"
      ? options.isTestingMode
      : options.isTestingMode.value
  }

  function handleMaterialMatched(payload: {
    materialInventory: { idno: string } | null | undefined
    matchedRows: unknown[]
  }) {
    options.onMaterialMatchedBase(payload)
    options.persistNow()   // 先同步寫入正確狀態（預覽前）
    options.suspendWrite() // 暫停 watcher 寫入，防止預覽狀態被快取

    // 接料預覽：使用 matchedRows 找候選站位，設為 ⛔
    const matchedSlots = payload.matchedRows as MaterialMatchedRow[]
    if (matchedSlots.length > 0) {
      const saved = new Map<string, string | null>()
      for (const matched of matchedSlots) {
        const row = options.rowData.value.find(
          r => r.slotIdno === matched.slotIdno &&
               (r.subSlotIdno ?? "") === (matched.subSlotIdno ?? "")
        )
        if (!row) continue
        const hasFirst = String(row.materialInventoryIdno ?? "").trim()
        const hasSplice = String(row.spliceMaterialInventoryIdno ?? "").trim()
        if (hasFirst && !hasSplice && (row.correct as string) === "MATCHED_MATERIAL_PACK") {
          const rowKey = `${row.slotIdno}-${row.subSlotIdno ?? ""}`
          saved.set(rowKey, row.correct as string)
          ;(row as any).correct = "UNLOADED"
          options.updateRowInGrid(row)
        }
      }
      options.splicePreviewCorrectStates.value = saved
    }

    nextTick(() => options.resumeWrite()) // Vue watcher flush 後恢復寫入
  }

  async function onSlotSubmit(payload: {
    slotIdno: string
    slot: string
    subSlot: string
  }) {
    const targetRow = options.findRowBySlotIdno(payload.slotIdno)
    const currentLoadedPackCode = String(targetRow?.appendedMaterialInventoryIdno ?? "").trim()
    const currentSplicePackCode = String(targetRow?.spliceMaterialInventoryIdno ?? "").trim()
    const newPackCode = options.getMaterialInventoryResult()?.materialInventory?.idno?.trim()

    if (targetRow && !options.isSpliceMode.value && (currentLoadedPackCode || currentSplicePackCode)) {
      options.showError(`站位 ${payload.slotIdno} 已有上料條碼，若要接料請先輸入 S5566`)
      options.resetInputsAfterSlotSubmit()
      return
    }

    if (targetRow && currentSplicePackCode) {
      options.showError(`站位 ${payload.slotIdno} 已有接料，請先卸除當前料捲`)
      options.resetInputsAfterSlotSubmit()
      return
    }

    if (targetRow && options.isSpliceMode.value && currentLoadedPackCode && newPackCode) {
      const isMatched = options.getMaterialInventoryResult()?.matchedRows?.some(
        (r) =>
          r.slotIdno === payload.slot &&
          (r.subSlotIdno ?? "") === (payload.subSlot ?? "")
      )
      let correctState: "MATCHED_MATERIAL_PACK" | "TESTING_MATERIAL_PACK"
      if (isMatched || (options.isMockMode && !isTestingModeValue())) {
        correctState = "MATCHED_MATERIAL_PACK"
      } else if (isTestingModeValue()) {
        correctState = "TESTING_MATERIAL_PACK"
      } else {
        options.showError(`料號不符：無法對站位 ${payload.slotIdno} 進行接料`)
        options.resetInputsAfterSlotSubmit()
        return
      }

      targetRow.spliceMaterialInventoryIdno = newPackCode
      targetRow.operatorIdno = options.getCurrentUsername()
      targetRow.operationTime = new Date().toISOString()
      if (correctState === "TESTING_MATERIAL_PACK") targetRow.remark = "[測試模式接料]"
      ;(targetRow as any).correct = correctState
      options.updateRowInGrid(targetRow)

      options.pendingSpliceRecords.value = [
        ...options.pendingSpliceRecords.value,
        {
          slotIdno: targetRow.slotIdno,
          subSlotIdno: targetRow.subSlotIdno ?? null,
          materialPackCode: newPackCode,
          correctState,
          operationTime: new Date().toISOString(),
        },
      ]
      options.splicePreviewCorrectStates.value = new Map()
      options.resetInputsAfterSlotSubmit()
      options.persistNow()
      return
    }

    try {
      const result = await options.handleSlotSubmitWithPolicy(payload)
      const updatedRow = options.findRowBySlotIdno(payload.slotIdno)
      if (updatedRow && newPackCode) {
        updatedRow.appendedMaterialInventoryIdno = newPackCode
        options.updateRowInGrid(updatedRow)
      }
      return result
    } finally {
      options.resetInputsAfterSlotSubmit()
      options.persistNow()
    }
  }

  return { handleMaterialMatched, onSlotSubmit }
}
