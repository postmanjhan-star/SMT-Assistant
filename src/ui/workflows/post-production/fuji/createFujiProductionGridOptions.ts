import type { GetRowIdParams, GridOptions } from 'ag-grid-community'
import { useDateFormatter } from '@/ui/shared/composables/useDateFormatter'
import type { FujiProductionRowModel } from '@/domain/production/buildFujiProductionRowData'
import { createBaseGridOptions } from '@/ui/shared/grid/createBaseGridOptions'

export function createFujiProductionGridOptions(): GridOptions<FujiProductionRowModel> {
  const { format } = useDateFormatter()

  return {
    ...createBaseGridOptions(),
    columnDefs: [
      {
        field: 'correct',
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
      { headerName: '巡檢料號', field: 'inspectMaterialPackCode', flex: 4, minWidth: 160 },
      {
        headerName: '巡檢時間',
        field: 'inspectTime',
        flex: 3,
        minWidth: 180,
        valueFormatter: (params) => format(params.value),
      },
      { field: 'mounterIdno', headerName: '機台', flex: 1, minWidth: 90 },
      { field: 'stage', headerName: 'Stage', flex: 1, minWidth: 90 },
      { field: 'slot', headerName: '站位', flex: 1, minWidth: 90 },
      { field: 'boardSide', headerName: '板面', flex: 1, minWidth: 90 },
      { field: 'operatorIdno', headerName: '作業員', flex: 2, minWidth: 80 },
      {
        field: 'operationTime',
        headerName: '作業時間',
        flex: 3,
        minWidth: 180,
        valueFormatter: (params) => format(params.value),
      },
      { field: 'materialIdno', headerName: '料號', flex: 4, minWidth: 160 },
      { field: 'materialInventoryIdno', headerName: '主料捲號', flex: 5, minWidth: 180 },
      { field: 'appendedMaterialInventoryIdno', headerName: '接料捲號', flex: 5, minWidth: 180 },
      { field: 'remark', headerName: '備註', flex: 3, minWidth: 120 },
    ],
    getRowId: (params: GetRowIdParams<FujiProductionRowModel>) =>
      `${params.data.mounterIdno}-${params.data.stage}-${params.data.slot}`,
  }
}
