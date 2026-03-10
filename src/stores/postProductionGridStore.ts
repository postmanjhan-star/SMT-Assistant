import { defineStore } from "pinia"

export type PostProductionGridPort = {
  getRowNode: (rowId: string) => any
  getRow: (slot: string, subSlot: string) => any | undefined
  getRowId: (row: { slotIdno: string; subSlotIdno?: string | null }) => string
  deselectRow: (rowId: string) => boolean
  cleanErrorMaterialInventory: (
    currentPackCode: string,
    inputSlot: string,
    inputSubSlot: string
  ) => void
  applyInspectionUpdate: (
    row: any,
    materialPackIdno: string,
    operatorIdno?: string | null
  ) => void
  setAppendedMaterialInventoryIdno: (
    rowId: string,
    appendedIdno: string,
    operatorIdno?: string | null
  ) => boolean
}

export const usePostProductionGridStore = defineStore(
  "postProductionGrid",
  () => {
    let grid: PostProductionGridPort | null = null

    function bindGrid(port: PostProductionGridPort) {
      grid = port
    }

    function getRowNode(rowId: string) {
      return grid?.getRowNode(rowId)
    }

    function getRow(slot: string, subSlot: string) {
      return grid?.getRow(slot, subSlot)
    }

    function getRowId(row: { slotIdno: string; subSlotIdno?: string | null }) {
      return grid?.getRowId(row) ?? ""
    }

    function deselectRow(rowId: string): boolean {
      return grid?.deselectRow(rowId) ?? false
    }

    function cleanErrorMaterialInventory(
      currentPackCode: string,
      inputSlot: string,
      inputSubSlot: string
    ) {
      grid?.cleanErrorMaterialInventory(
        currentPackCode,
        inputSlot,
        inputSubSlot
      )
    }

    function applyInspectionUpdate(
      row: any,
      materialPackIdno: string,
      operatorIdno?: string | null
    ) {
      grid?.applyInspectionUpdate(row, materialPackIdno, operatorIdno)
    }

    function setAppendedMaterialInventoryIdno(
      rowId: string,
      appendedIdno: string,
      operatorIdno?: string | null
    ): boolean {
      return (
        grid?.setAppendedMaterialInventoryIdno(rowId, appendedIdno, operatorIdno) ??
        false
      )
    }

    return {
      bindGrid,
      getRowNode,
      getRow,
      getRowId,
      deselectRow,
      cleanErrorMaterialInventory,
      applyInspectionUpdate,
      setAppendedMaterialInventoryIdno,
    }
  }
)

export type PostProductionGridStore = ReturnType<
  typeof usePostProductionGridStore
>
