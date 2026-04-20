import { ref } from 'vue'
import { resolveMaterialLookupError } from '@/domain/material/MaterialLookupError'
import { msg } from '@/ui/shared/messageCatalog'
import {
  getCurrentLoadedPackCode,
  getCurrentSplicePackCode,
  isSlotResolveFailure,
  type UnloadReplaceRowBase,
  type UseUnloadReplaceFlowOptions,
} from './unloadReplaceFlow/types'
import { createUnloadSubmitter } from './unloadReplaceFlow/unloadSubmitter'
import { createReplaceSpliceSubmitter } from './unloadReplaceFlow/replaceSpliceSubmitter'

export type {
  UnloadReplaceRowBase,
  SlotResolveFailure,
  SlotResolveSuccess,
  SlotResolveResult,
  UnloadReplaceSlotStrategy,
  UnloadReplaceUploader,
  UseUnloadReplaceFlowOptions,
} from './unloadReplaceFlow/types'

export function useUnloadReplaceFlow<TRow extends UnloadReplaceRowBase>(
  options: UseUnloadReplaceFlowOptions<TRow>
) {
  const { getGridApi, slotStrategy, uploader, getOperatorId, ui } = options

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

  const { submitUnload, submitForceUnloadBySlot } = createUnloadSubmitter<TRow>({
    getGridApi, slotStrategy, uploader, getOperatorId, ui,
  })

  const { submitReplace, submitSplice } = createReplaceSpliceSubmitter<TRow>({
    getGridApi,
    slotStrategy,
    uploader,
    getOperatorId,
    isTestingMode: options.isTestingMode,
    isMockMode: options.isMockMode,
    ui,
    onAfterReplaceGridUpdate: options.onAfterReplaceGridUpdate,
  })

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
