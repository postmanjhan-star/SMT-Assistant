import type { GridApi } from 'ag-grid-community'
import type { CheckMaterialMatchEnum } from '@/application/post-production-feed/clientTypes'

export type UnloadReplaceRowBase = {
  id: number
  materialIdno: string
  materialInventoryIdno: string | null
  appendedMaterialInventoryIdno?: string | null
  spliceMaterialInventoryIdno?: string | null
  correct: string | null
  operationTime?: string | null
}

export type SlotResolveFailure = { ok: false; error: string }
export type SlotResolveSuccess<TRow> = {
  ok: true
  row: TRow
  statId: number
  uploadSlotIdno: string
  uploadSubSlotIdno: string | null
  displaySlotIdno: string
  rowId: string
}
export type SlotResolveResult<TRow> = SlotResolveFailure | SlotResolveSuccess<TRow>

export function isSlotResolveFailure<TRow>(
  result: SlotResolveResult<TRow>
): result is SlotResolveFailure {
  return result.ok === false
}

export type UnloadReplaceSlotStrategy<TRow extends UnloadReplaceRowBase> = {
  resolveSlot: (slotIdno: string) => SlotResolveResult<TRow>
  toDisplaySlotIdno: (row: TRow) => string
  toRowId: (row: TRow) => string
  getRowData: () => TRow[]
}

export type UnloadReplaceUploader = {
  uploadUnfeed: (params: {
    statId: number
    slotIdno: string
    subSlotIdno: string | null
    materialPackCode: string
    unfeedReason?: string | null
    operatorId?: string | null
    checkPackCodeMatch?: CheckMaterialMatchEnum | null
  }) => Promise<void>
  uploadAppend: (params: {
    statId: number
    slotIdno: string
    subSlotIdno: string | null
    materialPackCode: string
    operatorId?: string | null
    correctState?: CheckMaterialMatchEnum | null
  }) => Promise<void>
  fetchMaterialInventory: (code: string) => Promise<{ material_idno?: string }>
}

export type UseUnloadReplaceFlowOptions<TRow extends UnloadReplaceRowBase> = {
  getGridApi: () => GridApi | null
  slotStrategy: UnloadReplaceSlotStrategy<TRow>
  uploader: UnloadReplaceUploader
  getOperatorId: () => string | null
  isTestingMode: () => boolean
  isMockMode?: () => boolean
  ui: {
    success: (msg: string) => void
    error: (msg: string) => void
  }
  onEnterUnloadMode?: () => void
  onAfterReplaceGridUpdate?: (rowId: string, gridApi: GridApi, now: string) => void
}

export function getCurrentLoadedPackCode(row: UnloadReplaceRowBase): string {
  return String(row.appendedMaterialInventoryIdno ?? '').trim()
}

export function getCurrentSplicePackCode(row: UnloadReplaceRowBase): string {
  return String(row.spliceMaterialInventoryIdno ?? '').trim()
}

export function safeGridUpdate(
  getGridApi: () => GridApi | null,
  rowId: string,
  updates: Record<string, unknown>,
) {
  try {
    const api = getGridApi()
    if (!api) return
    const rowNode = api.getRowNode?.(rowId)
    if (!rowNode) return
    Object.entries(updates).forEach(([key, value]) => {
      rowNode.setDataValue(key, value)
    })
  } catch {
    // Grid may be unmounted (e.g. in unload mode).
  }
}
