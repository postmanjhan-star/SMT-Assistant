import type {
    GridOptions,
    GetRowIdParams,
    RowNode,
    CellValueChangedEvent,
} from 'ag-grid-community'
import type { ProductionRowModel } from '@/pages/mounter/panasonic/types/production'
import { useDateFormatter } from '@/ui/shared/composables/useDateFormatter'

export function createProductionGridOptions(
    rowDataRef: { value: ProductionRowModel[] }
): GridOptions {
    const { format } = useDateFormatter()

    return {
        columnDefs: [
            {
                field: 'correct',
                tooltipField: 'correct',
                headerName: '',
                flex: 1,
                minWidth: 60,
                refData: { true: '✅', false: '❌', warning: '⚠️' },
            },
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
            {
                field: 'operatorIdno',
                tooltipField: 'operatorIdno',
                headerName: '上料人員',
                flex: 3,
                minWidth: 120,
            },
            {
                field: 'materialIdno',
                tooltipField: 'materialIdno',
                headerName: '料號',
                flex: 4,
                minWidth: 140,
            },
            {
                field: 'materialInventoryIdno',
                tooltipField: 'materialInventoryIdno',
                headerName: '上料條碼',
                flex: 5,
                minWidth: 140,
            },
            {
                field: 'appendedMaterialInventoryIdno',
                tooltipField: 'appendedMaterialInventoryIdno',
                headerName: '接料條碼',
                flex: 5,
                minWidth: 140,
            },
            { field: 'remark', headerName: '備註', flex: 3, minWidth: 120 },
        ],
        defaultColDef: {
            editable: false,
            filter: true,
            sortable: true,
            resizable: true,
        },
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
        getBusinessKeyForNode: (node: RowNode<ProductionRowModel>) =>
            `${node.data.slotIdno}-${node.data.subSlotIdno}`,
        rowModelType: 'clientSide',
        getRowId: (params: GetRowIdParams<ProductionRowModel>) =>
            `${params.data.slotIdno}-${params.data.subSlotIdno ?? ''}`,
        debounceVerticalScrollbar: false,
        enableCellTextSelection: true,
        rowSelection: 'multiple',
        suppressCellFocus: true,
        suppressRowTransform: true,
        enableBrowserTooltips: false,
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
