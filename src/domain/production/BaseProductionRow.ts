export type BaseProductionRow = {
  id: number
  materialIdno: string
  operatorIdno: string | null
  materialInventoryIdno: string | null
  appendedMaterialInventoryIdno?: string
  remark?: string
}
