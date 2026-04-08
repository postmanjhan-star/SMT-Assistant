/* eslint-disable no-restricted-imports -- [Phase-1 whitelist] tracked in REFACTORING_BASELINE.md, fix in Phase 3 */
import { ref } from 'vue'
import { type GridApi } from 'ag-grid-community'
import { CheckMaterialMatchEnum } from '@/client'
import { appendMaterialCode, removeMaterialCode } from '@/domain/production/PostProductionFeedRules'
import { resolveMaterialLookupError } from '@/domain/material/MaterialLookupError'
import { msg } from '@/ui/shared/messageCatalog'

// ── Row base type ────────────────────────────────────────────────────────────

export type UnloadReplaceRowBase = {
  id: number
  materialIdno: string
  materialInventoryIdno: string | null
  appendedMaterialInventoryIdno?: string | null
  spliceMaterialInventoryIdno?: string | null
  correct: string | null
  operationTime?: string | null
}

// ── Strategy: machine-specific slot resolution ───────────────────────────────

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

function isSlotResolveFailure<TRow>(
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

// ── Uploader: machine-specific API calls ─────────────────────────────────────

export type UnloadReplaceUploader = {
  uploadUnfeed: (params: {
    statId: number
    slotIdno: string
    subSlotIdno: string | null
    materialPackCode: string
    unfeedReason?: string | null
    operatorId?: string | null
  }) => Promise<void>
  uploadAppend: (params: {
    statId: number
    slotIdno: string
    subSlotIdno: string | null
    materialPackCode: string
    operatorId?: string | null
  }) => Promise<void>
  fetchMaterialInventory: (code: string) => Promise<{ material_idno?: string }>
}

// ── Options ──────────────────────────────────────────────────────────────────

export type UseUnloadReplaceFlowOptions<TRow extends UnloadReplaceRowBase> = {
  getGridApi: () => GridApi | null
  slotStrategy: UnloadReplaceSlotStrategy<TRow>
  uploader: UnloadReplaceUploader
  getOperatorId: () => string | null
  ui: {
    success: (msg: string) => void
    error: (msg: string) => void
  }
  /** Called after enterUnloadMode (e.g. Fuji needs resetForms) */
  onEnterUnloadMode?: () => void
  /** Called after submitReplace grid update for machine-specific extra fields */
  onAfterReplaceGridUpdate?: (rowId: string, gridApi: GridApi, now: string) => void
}

// ── Composable ────────────────────────────────────────────────────────────────

export function useUnloadReplaceFlow<TRow extends UnloadReplaceRowBase>(
  options: UseUnloadReplaceFlowOptions<TRow>
) {
  const { getGridApi, slotStrategy, uploader, getOperatorId, ui } = options

  // ── Unload mode state ──────────────────────────────────────────────────────

  const isUnloadMode = ref(false)

  function enterUnloadMode() {
    isUnloadMode.value = true
    options.onEnterUnloadMode?.()
  }

  function exitUnloadMode() {
    isUnloadMode.value = false
  }

  function toggleUnloadMode() {
    if (isUnloadMode.value) {
      exitUnloadMode()
    } else {
      enterUnloadMode()
    }
  }

  // ── Utilities ──────────────────────────────────────────────────────────────

  function getCurrentLoadedPackCode(row: TRow): string {
    return String(row.appendedMaterialInventoryIdno ?? '').trim()
  }

  function getCurrentSplicePackCode(row: TRow): string {
    return String(row.spliceMaterialInventoryIdno ?? '').trim()
  }

  function safeGridUpdate(rowId: string, updates: Record<string, unknown>) {
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

  // ── findUniqueUnloadSlotByPackCode ─────────────────────────────────────────

  function findUniqueUnloadSlotByPackCode(materialPackCode: string):
    | { ok: false; error: string }
    | { ok: true; slotIdno: string; rowId: string } {
    const targetPackCode = materialPackCode.trim()
    if (!targetPackCode) {
      return { ok: false, error: '請先輸入物料條碼' }
    }

    const matchedRows = slotStrategy.getRowData().filter((row) => {
      const inLoaded = getCurrentLoadedPackCode(row) === targetPackCode
      const inSplice = getCurrentSplicePackCode(row) === targetPackCode
      return inLoaded || inSplice
    })

    if (matchedRows.length === 0) {
      return { ok: false, error: `找不到料號 ${targetPackCode} 對應的站位` }
    }

    if (matchedRows.length > 1) {
      const slots = matchedRows.map((row) => slotStrategy.toDisplaySlotIdno(row)).join(', ')
      return { ok: false, error: `料號 ${targetPackCode} 對應多個站位：${slots}` }
    }

    const matched = matchedRows[0]
    return {
      ok: true,
      slotIdno: slotStrategy.toDisplaySlotIdno(matched),
      rowId: slotStrategy.toRowId(matched),
    }
  }

  // ── validateUnloadMaterialPackCode ─────────────────────────────────────────

  async function validateUnloadMaterialPackCode(materialPackCode: string): Promise<boolean> {
    const trimmed = materialPackCode.trim()
    if (!trimmed) {
      ui.error(msg.input.materialRequired)
      return false
    }
    try {
      await uploader.fetchMaterialInventory(trimmed)
      return true
    } catch (error) {
      ui.error(resolveMaterialLookupError(error))
      console.error(error)
      return false
    }
  }

  // ── validateReplacementMaterialForSlot ─────────────────────────────────────

  async function validateReplacementMaterialForSlot(params: {
    materialPackCode: string
    slotIdno: string
  }): Promise<boolean> {
    const materialPackCode = params.materialPackCode.trim()
    const slotIdno = params.slotIdno.trim()
    if (!materialPackCode) {
      ui.error(msg.input.materialRequired)
      return false
    }

    const resolved = slotStrategy.resolveSlot(slotIdno)
    if (isSlotResolveFailure(resolved)) {
      ui.error(resolved.error)
      return false
    }

    try {
      const materialInventory = await uploader.fetchMaterialInventory(materialPackCode)
      const scannedMaterialId = String(materialInventory.material_idno ?? '').trim()
      const expectedMaterialId = String(resolved.row.materialIdno ?? '').trim()
      if (!scannedMaterialId || scannedMaterialId !== expectedMaterialId) {
        ui.error(msg.material.packCodeMismatchForStation(slotIdno, expectedMaterialId))
        return false
      }
      return true
    } catch (error) {
      ui.error(resolveMaterialLookupError(error))
      console.error(error)
      return false
    }
  }

  // ── submitUnload ───────────────────────────────────────────────────────────

  async function submitUnload(params: {
    materialPackCode: string
    slotIdno: string
    unfeedReason?: string | null
  }): Promise<boolean> {
    const materialPackCode = params.materialPackCode.trim()
    const slotIdno = params.slotIdno.trim()

    if (!materialPackCode) {
      ui.error(msg.input.materialRequired)
      return false
    }

    const resolved = slotStrategy.resolveSlot(slotIdno)
    if (isSlotResolveFailure(resolved)) {
      ui.error(resolved.error)
      return false
    }

    const { row, statId, uploadSlotIdno, uploadSubSlotIdno, displaySlotIdno, rowId } = resolved

    const currentLoadedPackCode = getCurrentLoadedPackCode(row)
    const currentSplicePackCode = getCurrentSplicePackCode(row)
    const unloadsLoadedPack = currentLoadedPackCode === materialPackCode
    const unloadsSplicePack = currentSplicePackCode === materialPackCode

    if (!unloadsLoadedPack && !unloadsSplicePack) {
      ui.error(msg.material.packCodeNotInSlotList(materialPackCode, displaySlotIdno))
      return false
    }

    try {
      await uploader.uploadUnfeed({
        statId,
        slotIdno: uploadSlotIdno,
        subSlotIdno: uploadSubSlotIdno,
        materialPackCode,
        unfeedReason: params.unfeedReason ?? 'MATERIAL_FINISHED',
        operatorId: getOperatorId(),
      })

      let nextAppended = currentLoadedPackCode
      let nextSplice = currentSplicePackCode
      let nextCorrect = CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK as string

      if (unloadsSplicePack) {
        nextSplice = ''
        if (!nextAppended) nextCorrect = 'UNLOADED_MATERIAL_PACK'
      } else if (currentSplicePackCode) {
        nextAppended = currentSplicePackCode
        nextSplice = ''
      } else {
        nextAppended = removeMaterialCode(row.appendedMaterialInventoryIdno, materialPackCode)
        nextCorrect = 'UNLOADED_MATERIAL_PACK'
      }

      row.appendedMaterialInventoryIdno = nextAppended
      row.spliceMaterialInventoryIdno = nextSplice || null
      row.correct = nextCorrect

      const gridUpdates: Record<string, unknown> = {
        appendedMaterialInventoryIdno: nextAppended,
        spliceMaterialInventoryIdno: nextSplice || null,
        correct: nextCorrect,
      }
      safeGridUpdate(rowId, gridUpdates)

      ui.success(msg.unload.success(materialPackCode, displaySlotIdno))
      return true
    } catch (error) {
      ui.error(msg.unload.uploadFailed)
      console.error(error)
      return false
    }
  }

  // ── submitForceUnloadBySlot ────────────────────────────────────────────────

  async function submitForceUnloadBySlot(params: {
    slotIdno: string
    unfeedReason?: string | null
  }): Promise<{ ok: boolean; slotIdno?: string; materialPackCode?: string }> {
    const slotIdno = params.slotIdno.trim()
    if (!slotIdno) {
      ui.error(msg.input.stationRequired)
      return { ok: false }
    }

    const resolved = slotStrategy.resolveSlot(slotIdno)
    if (isSlotResolveFailure(resolved)) {
      ui.error(resolved.error)
      return { ok: false }
    }

    const { row } = resolved
    const splicePackCode = getCurrentSplicePackCode(row)
    const loadedPackCode = getCurrentLoadedPackCode(row)
    const legacyMainPackCode = String(row.materialInventoryIdno ?? '').trim()
    const materialPackCode = splicePackCode || loadedPackCode || legacyMainPackCode

    if (!materialPackCode) {
      ui.error(msg.slot.noMaterialToUnload(slotIdno))
      return { ok: false }
    }

    const success = await submitUnload({
      materialPackCode,
      slotIdno,
      unfeedReason: params.unfeedReason ?? 'WRONG_MATERIAL',
    })

    if (!success) {
      return { ok: false }
    }

    return {
      ok: true,
      slotIdno: slotStrategy.toDisplaySlotIdno(row),
      materialPackCode,
    }
  }

  // ── submitReplace ──────────────────────────────────────────────────────────

  async function submitReplace(params: {
    materialPackCode: string
    slotIdno: string
  }): Promise<boolean> {
    const materialPackCode = params.materialPackCode.trim()
    const slotIdno = params.slotIdno.trim()
    if (!materialPackCode) {
      ui.error(msg.input.materialRequired)
      return false
    }

    const resolved = slotStrategy.resolveSlot(slotIdno)
    if (isSlotResolveFailure(resolved)) {
      ui.error(resolved.error)
      return false
    }

    const { row, statId, uploadSlotIdno, uploadSubSlotIdno, displaySlotIdno, rowId } = resolved

    try {
      await uploader.uploadAppend({
        statId,
        slotIdno: uploadSlotIdno,
        subSlotIdno: uploadSubSlotIdno,
        materialPackCode,
        operatorId: getOperatorId(),
      })

      const now = new Date().toISOString()
      const nextAppended = appendMaterialCode(row.appendedMaterialInventoryIdno, materialPackCode)
      row.appendedMaterialInventoryIdno = nextAppended
      row.spliceMaterialInventoryIdno = null
      row.correct = CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK
      row.operationTime = now

      safeGridUpdate(rowId, {
        appendedMaterialInventoryIdno: nextAppended,
        spliceMaterialInventoryIdno: null,
        correct: CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK,
        operationTime: now,
      })

      const api = getGridApi()
      if (options.onAfterReplaceGridUpdate && api) {
        options.onAfterReplaceGridUpdate(rowId, api, now)
      }

      ui.success(msg.feed.success(materialPackCode, displaySlotIdno))
      return true
    } catch (error) {
      ui.error(msg.feed.uploadFailed)
      console.error(error)
      return false
    }
  }

  async function submitSplice(params: {
    materialPackCode: string
    slotIdno: string
  }): Promise<boolean> {
    const materialPackCode = params.materialPackCode.trim()
    const slotIdno = params.slotIdno.trim()
    if (!materialPackCode) {
      ui.error(msg.input.materialRequired)
      return false
    }

    const resolved = slotStrategy.resolveSlot(slotIdno)
    if (isSlotResolveFailure(resolved)) {
      ui.error(resolved.error)
      return false
    }

    const { row, statId, uploadSlotIdno, uploadSubSlotIdno, displaySlotIdno, rowId } = resolved

    try {
      await uploader.uploadAppend({
        statId,
        slotIdno: uploadSlotIdno,
        subSlotIdno: uploadSubSlotIdno,
        materialPackCode,
        operatorId: getOperatorId(),
      })

      const now = new Date().toISOString()
      row.spliceMaterialInventoryIdno = materialPackCode
      row.correct = CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK
      row.operationTime = now

      safeGridUpdate(rowId, {
        spliceMaterialInventoryIdno: materialPackCode,
        correct: CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK,
        operationTime: now,
      })

      const api = getGridApi()
      if (options.onAfterReplaceGridUpdate && api) {
        options.onAfterReplaceGridUpdate(rowId, api, now)
      }

      ui.success(msg.feed.success(materialPackCode, displaySlotIdno))
      return true
    } catch (error) {
      ui.error(msg.feed.uploadFailed)
      console.error(error)
      return false
    }
  }

  // ── Return ─────────────────────────────────────────────────────────────────

  return {
    isUnloadMode,
    enterUnloadMode,
    exitUnloadMode,
    toggleUnloadMode,
    findUniqueUnloadSlotByPackCode,
    validateUnloadMaterialPackCode,
    validateReplacementMaterialForSlot,
    submitUnload,
    submitForceUnloadBySlot,
    submitReplace,
    submitSplice,
  }
}
