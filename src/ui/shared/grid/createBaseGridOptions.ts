import type { GridOptions } from 'ag-grid-community'

/** 所有機種共用的基底 Grid 設定 */
export function createBaseGridOptions(): GridOptions {
  return {
    defaultColDef: { editable: false, filter: true, sortable: true, resizable: true },
    enableCellChangeFlash: true,
    rowSelection: 'multiple',
    suppressCellFocus: true,
  }
}

/** Panasonic 機種的基底設定（含性能優化與編輯相關設定） */
export function createPanasonicBaseGridOptions(): GridOptions {
  return {
    ...createBaseGridOptions(),
    suppressMovableColumns: false,
    suppressColumnMoveAnimation: true,
    stopEditingWhenCellsLoseFocus: true,
    enterNavigatesVerticallyAfterEdit: true,
    undoRedoCellEditing: true,
    rowBuffer: 100,
    valueCache: true,
    debug: false,
    pagination: false,
    enableCellTextSelection: true,
    suppressColumnVirtualisation: true,
    suppressRowVirtualisation: false,
    domLayout: 'normal',
    rowModelType: 'clientSide',
    debounceVerticalScrollbar: false,
    suppressRowTransform: true,
    enableBrowserTooltips: false,
  }
}
