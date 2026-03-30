export type BaseProductionRow = {
  id: number
  materialIdno: string
  operatorIdno: string | null
  materialInventoryIdno: string | null
  appendedMaterialInventoryIdno?: string
  inspectMaterialPackCode?: string
  inspectTime?: string | null
  inspectCount?: number
  inspectorIdno?: string | null
  remark?: string
}
