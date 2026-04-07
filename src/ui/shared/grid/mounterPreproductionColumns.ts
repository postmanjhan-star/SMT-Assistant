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
  return { field: 'materialInventoryIdno', tooltipField: 'materialInventoryIdno', headerName: '首次上料條碼', flex: 5, minWidth: 140, ...overrides }
}

export function createAppendedMaterialInventoryIdnoColDef(overrides?: Partial<ColDef>): ColDef {
  return { field: 'appendedMaterialInventoryIdno', tooltipField: 'appendedMaterialInventoryIdno', headerName: '當前上料條碼', flex: 5, minWidth: 140, ...overrides }
}

export function createSpliceMaterialInventoryIdnoColDef(overrides?: Partial<ColDef>): ColDef {
  return { field: 'spliceMaterialInventoryIdno', tooltipField: 'spliceMaterialInventoryIdno', headerName: '當前接料條碼', flex: 5, minWidth: 140, ...overrides }
}

export const remarkColDef: ColDef = { field: 'remark', headerName: '備註', flex: 3, minWidth: 120 }

export function createInspectMaterialPackCodeColDef(overrides?: Partial<ColDef>): ColDef {
  return { field: 'inspectMaterialPackCode', tooltipField: 'inspectMaterialPackCode', headerName: '覆檢料號', flex: 5, minWidth: 140, hide: true, ...overrides }
}

export function createInspectTimeColDef(format: (val: unknown) => string, overrides?: Partial<ColDef>): ColDef {
  return { field: 'inspectTime', tooltipField: 'inspectTime', headerName: '覆檢時間', flex: 3, minWidth: 180, hide: true, valueFormatter: (p) => format(p.value), ...overrides }
}

export function createInspectorIdnoColDef(overrides?: Partial<ColDef>): ColDef {
  return { field: 'inspectorIdno', tooltipField: 'inspectorIdno', headerName: '覆檢人', flex: 3, minWidth: 120, hide: true, ...overrides }
}
