import { ref } from 'vue'
import { type GridApi } from 'ag-grid-community'
import { CheckMaterialMatchEnum } from '@/client'
import { appendMaterialCode, removeMaterialCode } from '@/domain/production/PostProductionFeedRules'

// ── Row base type ────────────────────────────────────────────────────────────

export type UnloadReplaceRowBase = {
  id: number
  materialIdno: string
  materialInventoryIdno: string | null
  appendedMaterialInventoryIdno?: string | null
  correct: string | null
  firstAppendTime?: string | null
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

  function parseAppendedCodes(value: string | null | undefined): string[] {
    const raw = String(value ?? '').trim()
    if (!raw) return []
    return raw
      .split(',')
      .map((code) => code.trim())
      .filter((code) => code.length > 0)
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
      const inMain = String(row.materialInventoryIdno ?? '').trim() === targetPackCode
      const inAppended = parseAppendedCodes(row.appendedMaterialInventoryIdno).includes(targetPackCode)
      return inMain || inAppended
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
      ui.error('請先輸入物料條碼')
      return false
    }
    try {
      await uploader.fetchMaterialInventory(trimmed)
      return true
    } catch (error) {
      ui.error('查無此物料條碼')
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
      ui.error('請先輸入物料條碼')
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
        ui.error(`料號不符：站位 ${slotIdno} 應為 ${expectedMaterialId}`)
        return false
      }
      return true
    } catch (error) {
      ui.error('查無此物料條碼')
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
      ui.error('請先輸入物料條碼')
      return false
    }

    const resolved = slotStrategy.resolveSlot(slotIdno)
    if (isSlotResolveFailure(resolved)) {
      ui.error(resolved.error)
      return false
    }

    const { row, statId, uploadSlotIdno, uploadSubSlotIdno, displaySlotIdno, rowId } = resolved

    const inMain = String(row.materialInventoryIdno ?? '').trim() === materialPackCode
    const inAppended = parseAppendedCodes(row.appendedMaterialInventoryIdno).includes(materialPackCode)

    if (!inMain && !inAppended) {
      ui.error(`料號 ${materialPackCode} 不在槽位 ${displaySlotIdno} 的主料或接料清單`)
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

      const nextAppended = removeMaterialCode(row.appendedMaterialInventoryIdno, materialPackCode)
      row.appendedMaterialInventoryIdno = nextAppended
      row.correct = 'UNLOADED_MATERIAL_PACK'
      if (inMain) {
        row.materialInventoryIdno = ''
      }

      const gridUpdates: Record<string, unknown> = {
        appendedMaterialInventoryIdno: nextAppended,
        correct: 'UNLOADED_MATERIAL_PACK',
      }
      if (inMain) {
        gridUpdates.materialInventoryIdno = ''
      }
      safeGridUpdate(rowId, gridUpdates)

      ui.success(`卸料成功：${materialPackCode} @ ${displaySlotIdno}`)
      return true
    } catch (error) {
      ui.error('卸料上傳失敗')
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
      ui.error('請輸入站位')
      return { ok: false }
    }

    const resolved = slotStrategy.resolveSlot(slotIdno)
    if (isSlotResolveFailure(resolved)) {
      ui.error(resolved.error)
      return { ok: false }
    }

    const { row } = resolved
    const appendedCodes = parseAppendedCodes(row.appendedMaterialInventoryIdno)
    const preferredPackCode = appendedCodes[appendedCodes.length - 1]
    const mainPackCode = String(row.materialInventoryIdno ?? '').trim()
    const materialPackCode = String(preferredPackCode ?? mainPackCode).trim()

    if (!materialPackCode) {
      ui.error(`槽位 ${slotIdno} 無可卸除料號`)
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
      ui.error('請先輸入物料條碼')
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
      row.correct = CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK
      const nextFirstAppendTime = row.firstAppendTime ?? now
      row.firstAppendTime = nextFirstAppendTime

      safeGridUpdate(rowId, {
        appendedMaterialInventoryIdno: nextAppended,
        correct: CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK,
        firstAppendTime: nextFirstAppendTime,
      })

      const api = getGridApi()
      if (options.onAfterReplaceGridUpdate && api) {
        options.onAfterReplaceGridUpdate(rowId, api, now)
      }

      ui.success(`接料成功：${materialPackCode} @ ${displaySlotIdno}`)
      return true
    } catch (error) {
      ui.error('上傳接料資料失敗')
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
    parseAppendedCodes,
    findUniqueUnloadSlotByPackCode,
    validateUnloadMaterialPackCode,
    validateReplacementMaterialForSlot,
    submitUnload,
    submitForceUnloadBySlot,
    submitReplace,
  }
}
