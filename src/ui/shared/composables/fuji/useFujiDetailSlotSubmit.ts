import { nextTick } from "vue"
import type { Ref } from "vue"
import type { FujiProductionRowModel } from "@/domain/production/buildFujiProductionRowData"
import type { FujiPreproductionSpliceRecord } from "@/ui/shared/composables/fuji/fujiPreproductionDetailTypes"
import { parseFujiSlotIdno } from "@/domain/slot/FujiSlotParser"

type FujiSlotSubmitRow = {
  materialInventoryIdno?: string | null
  spliceMaterialInventoryIdno?: string | null
  materialIdno?: string | null
  correct?: string | null
  mounterIdno?: string
  stage?: string
  slot?: number | string
}

export type FujiDetailSlotSubmitOptions = {
  splicePreviewCorrectStates: Ref<Map<string, string | null>>
  rowData: Ref<FujiSlotSubmitRow[]>
  isSpliceMode: Ref<boolean>
  isTestingMode: Ref<boolean>
  isMockMode: boolean
  getMaterialInventory: () => { idno?: string; material_idno?: string | null } | null | undefined
  getCurrentUsername: () => string | null
  findRowBySlotIdno: (slotIdno: string) => FujiProductionRowModel | undefined
  updateRowInGrid: (row: FujiProductionRowModel) => void
  handleMaterialMatched: (payload: { materialInventory: Record<string, unknown> }) => void
  handleMaterialError: (message: string) => void
  handleSlotSubmit: (payload: { slotIdno: string }) => Promise<unknown>
  persistNow: () => void
  suspendWrite: () => void
  resumeWrite: () => void
  clearNormalScanState: () => void
  focusMaterialInput: () => void
  showError: (message: string) => void
  pendingSpliceRecords: Ref<FujiPreproductionSpliceRecord[]>
}

export function useFujiDetailSlotSubmit(options: FujiDetailSlotSubmitOptions) {
  function onMaterialMatched(payload: Parameters<typeof options.handleMaterialMatched>[0]) {
    options.handleMaterialMatched(payload)
    options.persistNow()   // 先同步寫入正確狀態（預覽前）
    options.suspendWrite() // 暫停 watcher 寫入，防止預覽狀態被快取

    // 接料預覽：已有首次上料、尚未接料的匹配站位設為 ⛔
    const scannedMaterialId = options.getMaterialInventory()?.material_idno
    if (scannedMaterialId) {
      const saved = new Map<string, string | null>()
      for (const row of options.rowData.value) {
        const hasFirst = String(row.materialInventoryIdno ?? "").trim()
        const hasSplice = String(row.spliceMaterialInventoryIdno ?? "").trim()
        if (
          row.materialIdno === scannedMaterialId &&
          hasFirst && !hasSplice &&
          row.correct === "MATCHED_MATERIAL_PACK"
        ) {
          const rowKey = `${row.mounterIdno}-${row.stage}-${row.slot}`
          saved.set(rowKey, row.correct)
          row.correct = "UNLOADED"
          options.updateRowInGrid(row as FujiProductionRowModel)
        }
      }
      options.splicePreviewCorrectStates.value = saved
    }

    nextTick(() => options.resumeWrite()) // Vue watcher flush 後恢復寫入
  }

  function onMaterialError(message: string) {
    options.handleMaterialError(message)
    options.persistNow()
  }

  async function onSlotSubmit(payload: { slotIdno: string }) {
    const targetRow = options.findRowBySlotIdno(payload.slotIdno)
    const currentLoadedPackCode = String(targetRow?.appendedMaterialInventoryIdno ?? "").trim()
    const currentMaterial = options.getMaterialInventory()
    const newPackCode = currentMaterial?.idno?.trim()
    const currentSplicePackCode = String(targetRow?.spliceMaterialInventoryIdno ?? "").trim()

    if (targetRow && !options.isSpliceMode.value && (currentLoadedPackCode || currentSplicePackCode)) {
      options.showError(`站位 ${payload.slotIdno} 已有上料條碼，若要接料請先輸入 S5566`)
      options.clearNormalScanState()
      return
    }

    if (targetRow && currentSplicePackCode) {
      options.showError(`站位 ${payload.slotIdno} 已有接料，請先卸除當前料捲`)
      options.clearNormalScanState()
      return
    }

    if (targetRow && options.isSpliceMode.value && currentLoadedPackCode && newPackCode) {
      const scannedMaterialId = String(currentMaterial?.material_idno ?? "").trim()
      const expectedMaterialId = String(targetRow.materialIdno ?? "").trim()

      let correctState: "MATCHED_MATERIAL_PACK" | "TESTING_MATERIAL_PACK"
      if (
        (scannedMaterialId && scannedMaterialId === expectedMaterialId) ||
        (options.isMockMode && !options.isTestingMode.value)
      ) {
        correctState = "MATCHED_MATERIAL_PACK"
      } else if (options.isTestingMode.value) {
        correctState = "TESTING_MATERIAL_PACK"
      } else {
        options.showError(`料號不符：無法對站位 ${payload.slotIdno} 進行接料`)
        options.clearNormalScanState()
        return
      }

      const parsed = parseFujiSlotIdno(payload.slotIdno)
      if (!parsed) {
        options.showError(`無法解析站位 ${payload.slotIdno}`)
        return
      }

      targetRow.spliceMaterialInventoryIdno = newPackCode
      targetRow.operatorIdno = options.getCurrentUsername()
      targetRow.operationTime = new Date().toISOString()
      if (correctState === "TESTING_MATERIAL_PACK") targetRow.remark = "[測試模式接料]"
      targetRow.correct = correctState
      options.updateRowInGrid(targetRow)

      options.pendingSpliceRecords.value = [
        ...options.pendingSpliceRecords.value,
        {
          slot: parsed.slot,
          stage: parsed.stage,
          materialPackCode: newPackCode,
          correctState,
          operationTime: new Date().toISOString(),
        },
      ]
      options.splicePreviewCorrectStates.value = new Map()
      options.clearNormalScanState()
      options.focusMaterialInput()
      options.persistNow()
      return
    }

    const result = await options.handleSlotSubmit(payload)
    options.clearNormalScanState()
    options.focusMaterialInput()
    const updatedRow = options.findRowBySlotIdno(payload.slotIdno)
    if (updatedRow && newPackCode) {
      updatedRow.appendedMaterialInventoryIdno = newPackCode
      updatedRow.operationTime = new Date().toISOString()
      options.updateRowInGrid(updatedRow)
    }
    options.persistNow()
    return result
  }

  return { onMaterialMatched, onMaterialError, onSlotSubmit }
}
