import type { GridOptions, GetRowIdParams, RowNode } from 'ag-grid-community'
import type { ProductionRowModel } from '@/domain/production/buildPanasonicRowData'
import { useDateFormatter } from '@/ui/shared/composables/useDateFormatter'
import { createPanasonicBaseGridOptions } from '@/ui/shared/grid/createBaseGridOptions'
import {
  createInspectMaterialPackCodeColDef,
  createInspectTimeColDef,
  createInspectorIdnoColDef,
} from '@/ui/shared/grid/mounterPreproductionColumns'

export function createPanasonicProductionGrid(): GridOptions<ProductionRowModel> {
  const { format } = useDateFormatter()

  return {
    ...createPanasonicBaseGridOptions(),
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
      { field: 'slotIdno', tooltipField: 'slotIdno', headerName: '站位', flex: 3, minWidth: 90 },
      {
        field: 'subSlotIdno',
        tooltipField: 'subSlotIdno',
        headerName: '子站位',
        flex: 1,
        minWidth: 100,
      },
      {
        field: 'operatorIdno',
        tooltipField: 'operatorIdno',
        headerName: '上料人員',
        flex: 2,
        minWidth: 120,
      },
      {
        field: 'operationTime',
        tooltipField: 'operationTime',
        headerName: '首次接料時間',
        flex: 3,
        minWidth: 180,
        valueFormatter: (params) => format(params.value),
      },
      { field: 'materialIdno', tooltipField: 'materialIdno', headerName: '料號', flex: 4, minWidth: 140 },
      {
        field: 'materialInventoryIdno',
        tooltipField: 'materialInventoryIdno',
        headerName: '首次上料條碼',
        flex: 5,
        minWidth: 140,
      },
      {
        field: 'appendedMaterialInventoryIdno',
        tooltipField: 'appendedMaterialInventoryIdno',
        headerName: '當前接料條碼',
        flex: 5,
        minWidth: 140,
      },
      { field: 'total', headerName: '總數', flex: 3, minWidth: 120 },
      { field: 'inspectCount', headerName: '巡檢次數', flex: 1, minWidth: 80, hide: true },
      createInspectMaterialPackCodeColDef(),
      createInspectTimeColDef(format),
      createInspectorIdnoColDef(),
      { field: 'remark', headerName: '備註', flex: 3, minWidth: 120 },
    ],
    getBusinessKeyForNode: (node: RowNode<ProductionRowModel>) => {
      return `${node.data.slotIdno}-${node.data.subSlotIdno}`
    },
    getRowId: (params: GetRowIdParams<ProductionRowModel>) => {
      return `${params.data.slotIdno}-${params.data.subSlotIdno}`
    },
  }
}
