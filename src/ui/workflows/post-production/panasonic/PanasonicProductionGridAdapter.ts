import type { GridOptions, GetRowIdParams, RowNode } from 'ag-grid-community'
import type { ProductionRowModel } from '@/domain/production/buildPanasonicRowData'
import { useDateFormatter } from '@/ui/shared/composables/useDateFormatter'

export function createPanasonicProductionGrid(): GridOptions<ProductionRowModel> {
  const { format } = useDateFormatter()

  return {
    columnDefs: [
      {
        field: 'correct',
        tooltipField: 'correct',
        headerName: '',
        flex: 1,
        minWidth: 60,
        refData: {
          MATCHED_MATERIAL_PACK: '✅',
          UNMATCHED_MATERIAL_PACK: '❌',
          UNLOADED_MATERIAL_PACK: '⛔',
          TESTING_MATERIAL_PACK: '⚠️',
        },
      },
      {
        headerName: '巡檢料號',
        field: 'inspectMaterialPackCode',
        flex: 2,
        minWidth: 100,
      },
      {
        headerName: '巡檢時間',
        field: 'inspectTime',
        flex: 2,
        minWidth: 150,
        valueFormatter: (params) => format(params.value),
      },
      { field: 'slotIdno', tooltipField: 'slotIdno', headerName: '站位', flex: 3, minWidth: 90 },
      {
        field: 'subSlotIdno',
        tooltipField: 'subSlotIdno',
        headerName: '子站位',
        flex: 1,
        minWidth: 100,
      },
      {
        field: 'firstAppendTime',
        tooltipField: 'firstAppendTime',
        headerName: '首次接料時間',
        flex: 3,
        minWidth: 180,
        valueFormatter: (params) => format(params.value),
      },
      { field: 'materialIdno', tooltipField: 'materialIdno', headerName: '料號', flex: 4, minWidth: 140 },
      {
        field: 'materialInventoryIdno',
        tooltipField: 'materialInventoryIdno',
        headerName: '主料捲號',
        flex: 5,
        minWidth: 140,
      },
      {
        field: 'appendedMaterialInventoryIdno',
        tooltipField: 'appendedMaterialInventoryIdno',
        headerName: '接料捲號',
        flex: 5,
        minWidth: 140,
      },
      { field: 'total', headerName: '總數', flex: 3, minWidth: 120 },
      { field: 'remark', headerName: '備註', flex: 3, minWidth: 120 },
    ],
    defaultColDef: { editable: false, filter: true, sortable: true, resizable: true },

    suppressMovableColumns: false,
    suppressColumnMoveAnimation: true,

    stopEditingWhenCellsLoseFocus: true,
    enterNavigatesVerticallyAfterEdit: true,
    undoRedoCellEditing: true,

    rowBuffer: 100,
    valueCache: true,
    debug: false,

    pagination: false,

    enableCellChangeFlash: true,
    suppressColumnVirtualisation: true,
    suppressRowVirtualisation: false,
    domLayout: 'normal',
    getBusinessKeyForNode: (node: RowNode<ProductionRowModel>) => {
      return `${node.data.slotIdno}-${node.data.subSlotIdno}`
    },

    rowModelType: 'clientSide',
    getRowId: (params: GetRowIdParams<ProductionRowModel>) => {
      return `${params.data.slotIdno}-${params.data.subSlotIdno}`
    },

    debounceVerticalScrollbar: false,

    enableCellTextSelection: true,
    rowSelection: 'multiple',
    suppressCellFocus: true,

    suppressRowTransform: true,

    enableBrowserTooltips: false,
  }
}
