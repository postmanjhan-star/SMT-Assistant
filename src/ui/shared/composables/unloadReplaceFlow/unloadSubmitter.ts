import type { GridApi } from 'ag-grid-community'
import { CheckMaterialMatchEnum } from '@/application/post-production-feed/clientTypes'
import { removeMaterialCode } from '@/domain/production/PostProductionFeedRules'
import { msg } from '@/ui/shared/messageCatalog'
import {
  getCurrentLoadedPackCode,
  getCurrentSplicePackCode,
  isSlotResolveFailure,
  safeGridUpdate,
  type UnloadReplaceRowBase,
  type UnloadReplaceSlotStrategy,
  type UnloadReplaceUploader,
} from './types'

export type UnloadSubmitterDeps<TRow extends UnloadReplaceRowBase> = {
  getGridApi: () => GridApi | null
  slotStrategy: UnloadReplaceSlotStrategy<TRow>
  uploader: UnloadReplaceUploader
  getOperatorId: () => string | null
  ui: {
    success: (msg: string) => void
    error: (msg: string) => void
  }
}

export function createUnloadSubmitter<TRow extends UnloadReplaceRowBase>(
  deps: UnloadSubmitterDeps<TRow>,
) {
  const { getGridApi, slotStrategy, uploader, getOperatorId, ui } = deps

  async function submitUnload(params: {
    materialPackCode: string
    slotIdno: string
    unfeedReason?: string | null
    checkPackCodeMatch?: CheckMaterialMatchEnum | null
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

    const checkPackCodeMatch = params.checkPackCodeMatch ?? (row.correct as CheckMaterialMatchEnum | null)

    try {
      await uploader.uploadUnfeed({
        statId,
        slotIdno: uploadSlotIdno,
        subSlotIdno: uploadSubSlotIdno,
        materialPackCode,
        unfeedReason: params.unfeedReason ?? 'MATERIAL_FINISHED',
        operatorId: getOperatorId(),
        checkPackCodeMatch,
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

      safeGridUpdate(getGridApi, rowId, {
        appendedMaterialInventoryIdno: nextAppended,
        spliceMaterialInventoryIdno: nextSplice || null,
        correct: nextCorrect,
      })

      ui.success(msg.unload.success(materialPackCode, displaySlotIdno))
      return true
    } catch (error) {
      ui.error(msg.unload.uploadFailed)
      console.error(error)
      return false
    }
  }

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

    const checkPackCodeMatch = row.correct as CheckMaterialMatchEnum | null

    const success = await submitUnload({
      materialPackCode,
      slotIdno,
      unfeedReason: params.unfeedReason ?? 'WRONG_MATERIAL',
      checkPackCodeMatch,
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

  return { submitUnload, submitForceUnloadBySlot }
}
