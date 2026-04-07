export type BaseProductionRow = {
  id: number
  materialIdno: string
  operatorIdno: string | null
  materialInventoryIdno: string | null
  appendedMaterialInventoryIdno?: string
  spliceMaterialInventoryIdno?: string | null
  inspectMaterialPackCode?: string
  inspectTime?: string | null
  inspectCount?: number
  inspectorIdno?: string | null
  remark?: string
}
