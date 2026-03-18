import type { ColDef } from 'ag-grid-community'

export function createCorrectColDef(refData: Record<string, string>): ColDef {
  return {
    field: 'correct',
    tooltipField: 'correct',
    headerName: '',
    flex: 1,
    minWidth: 60,
    refData,
  }
}

export function createMaterialIdnoColDef(overrides?: Partial<ColDef>): ColDef {
  return { field: 'materialIdno', tooltipField: 'materialIdno', headerName: '料號', flex: 4, minWidth: 140, ...overrides }
}

export function createOperatorIdnoColDef(overrides?: Partial<ColDef>): ColDef {
  return { field: 'operatorIdno', tooltipField: 'operatorIdno', headerName: '上料人員', flex: 3, minWidth: 120, ...overrides }
}

export function createMaterialInventoryIdnoColDef(overrides?: Partial<ColDef>): ColDef {
  return { field: 'materialInventoryIdno', tooltipField: 'materialInventoryIdno', headerName: '上料條碼', flex: 5, minWidth: 140, ...overrides }
}

export const remarkColDef: ColDef = { field: 'remark', headerName: '備註', flex: 3, minWidth: 120 }
