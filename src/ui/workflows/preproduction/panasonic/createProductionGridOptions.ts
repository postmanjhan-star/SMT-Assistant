import type {
    GridOptions,
    GetRowIdParams,
    CellValueChangedEvent,
} from 'ag-grid-community'
import type { ProductionRowModel } from '@/pages/mounter/panasonic/types/production'
import { useDateFormatter } from '@/ui/shared/composables/useDateFormatter'
import { createPanasonicBaseGridOptions } from '@/ui/shared/grid/createBaseGridOptions'
import {
    createCorrectColDef,
    createMaterialIdnoColDef,
    createOperatorIdnoColDef,
    createMaterialInventoryIdnoColDef,
    remarkColDef,
} from '@/ui/shared/grid/mounterPreproductionColumns'

export function createProductionGridOptions(
    rowDataRef: { value: ProductionRowModel[] }
): GridOptions {
    const { format } = useDateFormatter()

    return {
        ...createPanasonicBaseGridOptions(),
        columnDefs: [
            createCorrectColDef({ true: '✅', false: '❌', warning: '⚠️', unloaded: '⛔' }),
            {
                field: 'slotIdno',
                tooltipField: 'slotIdno',
                headerName: '槽位',
                flex: 3,
                minWidth: 90,
            },
            {
                field: 'subSlotIdno',
                tooltipField: 'subSlotIdno',
                headerName: '副槽位',
                flex: 1,
                minWidth: 100,
            },
            {
                field: 'firstAppendTime',
                tooltipField: 'firstAppendTime',
                headerName: '上料時間',
                flex: 3,
                minWidth: 180,
                valueFormatter: p => format(p.value),
            },
            createOperatorIdnoColDef(),
            createMaterialIdnoColDef(),
            createMaterialInventoryIdnoColDef(),
            {
                field: 'appendedMaterialInventoryIdno',
                tooltipField: 'appendedMaterialInventoryIdno',
                headerName: '接料條碼',
                flex: 5,
                minWidth: 140,
            },
            remarkColDef,
        ],
        getRowId: (params: GetRowIdParams<ProductionRowModel>) =>
            `${params.data.slotIdno}-${params.data.subSlotIdno ?? ''}`,
        onCellValueChanged: (event: CellValueChangedEvent<ProductionRowModel>) => {
            const idx = rowDataRef.value.findIndex(
                r =>
                    r.slotIdno === event.data.slotIdno &&
                    r.subSlotIdno === event.data.subSlotIdno
            )
            if (idx >= 0) rowDataRef.value[idx] = { ...event.data }
        },
    }
}
