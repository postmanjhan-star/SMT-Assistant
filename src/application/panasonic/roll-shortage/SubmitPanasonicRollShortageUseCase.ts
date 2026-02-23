import { ApiError } from "@/client"
import { RollShortagePolicy } from "@/domain/preproduction/RollShortagePolicy"

export type PanasonicRollShortageInput = {
  materialInventoryIdno: string
  slotIdno: string
  type: string
}

export type PanasonicRollShortageError =
  | { code: "materialInventoryIdno_required" }
  | { code: "slotIdno_required" }
  | { code: "type_required" }
  | { code: "stat_not_found" }
  | { code: "row_not_found"; slotIdno: string }
  | { code: "no_material_in_grid" }
  | { code: "inventory_not_found" }
  | { code: "erp_timeout" }
  | { code: "erp_bad_gateway" }
  | { code: "server_error" }
  | { code: "unknown_api_error" }
  | { code: "unknown_error" }

export type PanasonicRollShortageInfo = {
  code: "testing_virtual_material"
  idno: string
}

export type PanasonicRollShortageUploadInput = {
  statId: number
  operationTime: string
  slotIdno: string
  subSlotIdno?: string | null
  materialPackCode: string
  feedMaterialPackType: string
  checkPackCodeMatch?: string | null
  operatorId?: string | null
}

export type PanasonicRollShortageUpdate<TRow> = {
  row: TRow
  rowId: string
  newAppendedMaterialInventoryIdno: string
}

export type PanasonicRollShortageResult<TRow> =
  | { ok: true; update: PanasonicRollShortageUpdate<TRow>; info?: PanasonicRollShortageInfo }
  | { ok: false; error: PanasonicRollShortageError }

export type PanasonicRollShortageRow = {
  slotIdno: string
  subSlotIdno?: string | null
  appendedMaterialInventoryIdno: string
}

export type SubmitPanasonicRollShortageUseCaseDeps<TRow extends PanasonicRollShortageRow> = {
  getRowData: () => TRow[]
  getStatBySlotIdno: (slotIdno: string) => { id: number } | null
  fetchMaterialInventory: (
    materialInventoryIdno: string
  ) => Promise<{ material_idno: string }>
  uploadRollRecord: (
    input: PanasonicRollShortageUploadInput
  ) => Promise<unknown>
  isTestingMode: () => boolean
  operatorId: () => string | null
  now: () => string
  matchRowsByMaterialIdno: (rows: TRow[], materialIdno: string) => TRow[]
  resolveRowId?: (row: TRow) => string
}

type SimpleErrorCode =
  | "materialInventoryIdno_required"
  | "slotIdno_required"
  | "type_required"
  | "stat_not_found"
  | "no_material_in_grid"
  | "inventory_not_found"
  | "erp_timeout"
  | "erp_bad_gateway"
  | "server_error"
  | "unknown_api_error"
  | "unknown_error"

const SIMPLE_ERROR_MAP: Record<SimpleErrorCode, PanasonicRollShortageError> = {
  materialInventoryIdno_required: { code: "materialInventoryIdno_required" },
  slotIdno_required: { code: "slotIdno_required" },
  type_required: { code: "type_required" },
  stat_not_found: { code: "stat_not_found" },
  no_material_in_grid: { code: "no_material_in_grid" },
  inventory_not_found: { code: "inventory_not_found" },
  erp_timeout: { code: "erp_timeout" },
  erp_bad_gateway: { code: "erp_bad_gateway" },
  server_error: { code: "server_error" },
  unknown_api_error: { code: "unknown_api_error" },
  unknown_error: { code: "unknown_error" },
}

export class SubmitPanasonicRollShortageUseCase<
  TRow extends PanasonicRollShortageRow
> {
  constructor(
    private deps: SubmitPanasonicRollShortageUseCaseDeps<TRow>
  ) {}

  async execute(
    input: PanasonicRollShortageInput
  ): Promise<PanasonicRollShortageResult<TRow>> {
    const validation = RollShortagePolicy.validateInput(input)
    if (!validation.ok) {
      const errorCode = "error" in validation ? validation.error : "unknown_error"
      return { ok: false, error: SIMPLE_ERROR_MAP[errorCode] }
    }

    const materialInventoryIdno = input.materialInventoryIdno.trim()
    const slotIdno = input.slotIdno.trim()
    const packType = input.type

    const stat = this.deps.getStatBySlotIdno(slotIdno)
    if (!stat) {
      return { ok: false, error: SIMPLE_ERROR_MAP.stat_not_found }
    }

    const parsed = RollShortagePolicy.parseSlotIdno(slotIdno)
    const rowData = this.deps.getRowData()
    const row = rowData.find(
      (r) =>
        r.slotIdno === parsed.slotIdno &&
        (r.subSlotIdno ?? "") === parsed.subSlotIdno
    )

    if (!row) {
      return {
        ok: false,
        error: { code: "row_not_found", slotIdno },
      }
    }

    let correctState: string | null = null
    let info: PanasonicRollShortageInfo | undefined

    try {
      const materialInventory = await this.deps.fetchMaterialInventory(
        materialInventoryIdno
      )

      const matchedRows = this.deps.matchRowsByMaterialIdno(
        rowData,
        materialInventory.material_idno
      )

      if (matchedRows.length === 0) {
        return { ok: false, error: SIMPLE_ERROR_MAP.no_material_in_grid }
      }

      correctState = "true"
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 404 && this.deps.isTestingMode()) {
          info = {
            code: "testing_virtual_material",
            idno: materialInventoryIdno,
          }
          correctState = "warning"
        } else {
          return {
            ok: false,
            error: this.mapApiError(error),
          }
        }
      } else {
        console.error(error)
        return { ok: false, error: SIMPLE_ERROR_MAP.unknown_error }
      }
    }

    await this.deps.uploadRollRecord({
      statId: stat.id,
      operatorId: this.deps.operatorId(),
      operationTime: this.deps.now(),
      slotIdno: parsed.slotIdno,
      subSlotIdno: parsed.subSlotIdno ?? null,
      materialPackCode: materialInventoryIdno,
      feedMaterialPackType: packType,
      checkPackCodeMatch: correctState,
    })

    const rowId = this.deps.resolveRowId
      ? this.deps.resolveRowId(row)
      : `${row.slotIdno}-${row.subSlotIdno ?? ""}`

    const newAppendedMaterialInventoryIdno =
      RollShortagePolicy.appendMaterialInventoryIdno(
        row.appendedMaterialInventoryIdno,
        materialInventoryIdno
      )

    return {
      ok: true,
      update: {
        row,
        rowId,
        newAppendedMaterialInventoryIdno,
      },
      info,
    }
  }

  private mapApiError(error: ApiError): PanasonicRollShortageError {
    if (error.status === 404) return SIMPLE_ERROR_MAP.inventory_not_found
    if (error.status === 504) return SIMPLE_ERROR_MAP.erp_timeout
    if (error.status === 502) return SIMPLE_ERROR_MAP.erp_bad_gateway
    if (error.status === 500) return SIMPLE_ERROR_MAP.server_error
    return SIMPLE_ERROR_MAP.unknown_api_error
  }
}
