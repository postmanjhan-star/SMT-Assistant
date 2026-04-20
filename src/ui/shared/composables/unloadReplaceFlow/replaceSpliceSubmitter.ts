import type { GridApi } from 'ag-grid-community'
import { CheckMaterialMatchEnum } from '@/application/post-production-feed/clientTypes'
import { appendMaterialCode } from '@/domain/production/PostProductionFeedRules'
import { resolveMaterialLookupError } from '@/domain/material/MaterialLookupError'
import { msg } from '@/ui/shared/messageCatalog'
import {
  getCurrentLoadedPackCode,
  isSlotResolveFailure,
  safeGridUpdate,
  type UnloadReplaceRowBase,
  type UnloadReplaceSlotStrategy,
  type UnloadReplaceUploader,
} from './types'

export type ReplaceSpliceSubmitterDeps<TRow extends UnloadReplaceRowBase> = {
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
  onAfterReplaceGridUpdate?: (rowId: string, gridApi: GridApi, now: string) => void
}

export function createReplaceSpliceSubmitter<TRow extends UnloadReplaceRowBase>(
  deps: ReplaceSpliceSubmitterDeps<TRow>,
) {
  const {
    getGridApi, slotStrategy, uploader, getOperatorId,
    isTestingMode, isMockMode, ui, onAfterReplaceGridUpdate,
  } = deps

  async function resolveExistenceCorrectState(
    materialPackCode: string,
  ): Promise<CheckMaterialMatchEnum | null> {
    if (isMockMode?.() && !isTestingMode()) {
      return CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK
    }
    try {
      await uploader.fetchMaterialInventory(materialPackCode.trim())
      return CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK
    } catch (error) {
      if (isTestingMode()) return CheckMaterialMatchEnum.TESTING_MATERIAL_PACK
      ui.error(resolveMaterialLookupError(error))
      return null
    }
  }

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
      const currentLoadedPackCode = getCurrentLoadedPackCode(row)

      row.correct = CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK
      row.operationTime = now

      if (currentLoadedPackCode) {
        row.spliceMaterialInventoryIdno = materialPackCode
        safeGridUpdate(getGridApi, rowId, {
          spliceMaterialInventoryIdno: materialPackCode,
          correct: CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK,
          operationTime: now,
        })
      } else {
        const nextAppended = appendMaterialCode(row.appendedMaterialInventoryIdno, materialPackCode)
        row.appendedMaterialInventoryIdno = nextAppended
        row.spliceMaterialInventoryIdno = null
        safeGridUpdate(getGridApi, rowId, {
          appendedMaterialInventoryIdno: nextAppended,
          spliceMaterialInventoryIdno: null,
          correct: CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK,
          operationTime: now,
        })
      }

      const api = getGridApi()
      if (onAfterReplaceGridUpdate && api) {
        onAfterReplaceGridUpdate(rowId, api, now)
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

    const checkPackCodeMatch = await resolveExistenceCorrectState(materialPackCode)
    if (checkPackCodeMatch === null) return false

    try {
      await uploader.uploadAppend({
        statId,
        slotIdno: uploadSlotIdno,
        subSlotIdno: uploadSubSlotIdno,
        materialPackCode,
        operatorId: getOperatorId(),
        correctState: checkPackCodeMatch,
      })

      const now = new Date().toISOString()
      row.spliceMaterialInventoryIdno = materialPackCode
      row.correct = checkPackCodeMatch
      row.operationTime = now

      safeGridUpdate(getGridApi, rowId, {
        spliceMaterialInventoryIdno: materialPackCode,
        correct: checkPackCodeMatch,
        operationTime: now,
      })

      const api = getGridApi()
      if (onAfterReplaceGridUpdate && api) {
        onAfterReplaceGridUpdate(rowId, api, now)
      }

      ui.success(msg.feed.success(materialPackCode, displaySlotIdno))
      return true
    } catch (error) {
      ui.error(msg.feed.uploadFailed)
      console.error(error)
      return false
    }
  }

  return { submitReplace, submitSplice, resolveExistenceCorrectState }
}
