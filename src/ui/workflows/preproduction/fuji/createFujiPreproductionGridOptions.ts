import type { GetRowIdParams, GridOptions } from "ag-grid-community"
import type { FujiMounterRowModel } from "@/ui/workflows/preproduction/fuji/composables/useFujiProductionState"
import { createBaseGridOptions } from "@/ui/shared/grid/createBaseGridOptions"
import { useDateFormatter } from "@/ui/shared/composables/useDateFormatter"
import {
  createCorrectColDef,
  createMaterialIdnoColDef,
  createOperatorIdnoColDef,
  createMaterialInventoryIdnoColDef,
  remarkColDef,
} from "@/ui/shared/grid/mounterPreproductionColumns"

export function createFujiPreproductionGridOptions(): GridOptions<FujiMounterRowModel> {
  const { format } = useDateFormatter()
  return {
    ...createBaseGridOptions(),
    columnDefs: [
      createCorrectColDef({ MATCHED_MATERIAL_PACK: "✅", UNMATCHED_MATERIAL_PACK: "❌", TESTING_MATERIAL_PACK: "⚠️", UNLOADED: "⛔" }),
      { field: "mounterIdno", headerName: "機台", flex: 1, minWidth: 90 },
      { field: "stage", headerName: "Stage", flex: 1, minWidth: 90 },
      { field: "slot", headerName: "槽位", flex: 1, minWidth: 90 },
      { field: "boardSide", headerName: "PCB面", flex: 1, minWidth: 90 },
      createMaterialIdnoColDef({ headerName: "物料號", minWidth: 160 }),
      createOperatorIdnoColDef({ flex: 4, minWidth: 160 }),
      createMaterialInventoryIdnoColDef({ headerName: "物料條碼", minWidth: 180 }),
      { headerName: '巡檢料號', field: 'inspectMaterialPackCode', flex: 2, minWidth: 100, hide: true },
      { headerName: '巡檢時間', field: 'inspectTime', flex: 2, minWidth: 150, hide: true, valueFormatter: (p: any) => format(p.value) },
      { headerName: '巡檢次數', field: 'inspectCount', flex: 1, minWidth: 80, hide: true },
      remarkColDef,
    ],
    getRowId: (params: GetRowIdParams<FujiMounterRowModel>) =>
      `${params.data.mounterIdno}-${params.data.stage}-${params.data.slot}`,
  }
}
