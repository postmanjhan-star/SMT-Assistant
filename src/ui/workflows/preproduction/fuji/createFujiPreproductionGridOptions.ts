import type { GetRowIdParams, GridOptions } from "ag-grid-community"
import type { FujiMounterRowModel } from "@/ui/workflows/preproduction/fuji/composables/useFujiProductionState"

export function createFujiPreproductionGridOptions(): GridOptions<FujiMounterRowModel> {
  return {
    columnDefs: [
      {
        field: "correct",
        headerName: "",
        flex: 1,
        minWidth: 60,
        refData: {
          MATCHED_MATERIAL_PACK: "✅",
          UNMATCHED_MATERIAL_PACK: "❌",
          TESTING_MATERIAL_PACK: "⚠️",
          UNLOADED: "⛔",
        },
      },
      { field: "mounterIdno", headerName: "機台", flex: 1, minWidth: 90 },
      { field: "stage", headerName: "Stage", flex: 1, minWidth: 90 },
      { field: "slot", headerName: "槽位", flex: 1, minWidth: 90 },
      { field: "boardSide", headerName: "PCB面", flex: 1, minWidth: 90 },
      { field: "materialIdno", headerName: "物料號", flex: 4, minWidth: 160 },
      { field: "operatorIdno", headerName: "上料人員", flex: 4, minWidth: 160 },
      { field: "materialInventoryIdno", headerName: "物料條碼", flex: 5, minWidth: 180 },
      { field: "remark", headerName: "備註", flex: 3, minWidth: 120 },
    ],
    defaultColDef: { editable: false, filter: true, sortable: true, resizable: true },
    enableCellChangeFlash: true,
    rowSelection: "multiple",
    suppressCellFocus: true,
    getRowId: (params: GetRowIdParams<FujiMounterRowModel>) =>
      `${params.data.mounterIdno}-${params.data.stage}-${params.data.slot}`,
  }
}
