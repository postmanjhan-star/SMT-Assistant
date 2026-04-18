import type { Ref } from "vue"
import { CheckMaterialMatchEnum } from "@/client"
import type { MaterialRepositoryResult } from "@/application/barcode-scan/BarcodeScanDeps"
import { resolveMaterialLookupError } from "@/domain/material/MaterialLookupError"
import { CORRECT_STATE } from "./materialPackCodeHelpers"
import type { OperationFlowRow } from "../MounterOperationFlowsAdapter"

export type MaterialValidatorDeps = {
  isTestingMode: Ref<boolean>
  isMockMode: boolean
  fetchMaterialInventory: (id: string) => Promise<MaterialRepositoryResult>
  showError: (msg: string) => void
  findRowBySlotIdno: (slotIdno: string) => OperationFlowRow | null
}

export function createMaterialValidator(deps: MaterialValidatorDeps) {
  const { isTestingMode, isMockMode, fetchMaterialInventory, showError, findRowBySlotIdno } = deps

  /**
   * FEED 類（S5566 接料、S5588 IPQC）：查詢 ERP，決定 check_pack_code_match。
   * - mockMode & !testing → MATCHED（不查 ERP）
   * - ERP 查到 → MATCHED
   * - ERP 查無 + testing → TESTING
   * - ERP 查無 + 正式 → showError, return null（阻斷操作）
   */
  async function resolveExistenceBasedCorrectState(
    materialPackCode: string,
  ): Promise<CheckMaterialMatchEnum | null> {
    const trimmed = materialPackCode.trim()
    if (!trimmed) { showError("請先輸入物料條碼"); return null }
    if (isMockMode && !isTestingMode.value) return CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK
    const result = await fetchMaterialInventory(trimmed)
    if (result.kind === "ok") return CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK
    if (isTestingMode.value) return CheckMaterialMatchEnum.TESTING_MATERIAL_PACK
    showError(resolveMaterialLookupError(result.error))
    return null
  }

  /**
   * UNFEED 類：只檢查料號存在性（不需要 correctState）。
   * - empty → 錯誤
   * - testing/mock → 略過 ERP 查詢
   * - ERP 查無 → 錯誤
   */
  async function validateUnloadMaterialPackCode(materialPackCode: string): Promise<boolean> {
    const trimmed = materialPackCode.trim()
    if (!trimmed) {
      showError("請先輸入物料條碼")
      return false
    }
    if (isTestingMode.value || isMockMode) return true
    const result = await fetchMaterialInventory(trimmed)
    if (result.kind !== "ok") {
      showError(resolveMaterialLookupError(result.error))
      return false
    }
    return true
  }

  /**
   * 換料（replacement）情境：確認新掃入的條碼與目標站位料號一致。
   * - mockMode & !testing → MATCHED（不查 ERP）
   * - ERP 查無 + testing → TESTING
   * - ERP 查無 + 正式 → 錯誤
   * - ERP 查到但料號不符（且非 testing） → 錯誤
   */
  async function resolveReplacementCorrectState(
    materialPackCode: string,
    targetSlotIdno: string,
  ): Promise<string | null> {
    const packCode = materialPackCode.trim()
    if (!packCode) { showError("請先輸入物料條碼"); return null }

    const row = findRowBySlotIdno(targetSlotIdno)
    if (!row) { showError(`找不到槽位 ${targetSlotIdno}`); return null }

    if (isMockMode && !isTestingMode.value) return CORRECT_STATE.MATCHED

    const fetchResult = await fetchMaterialInventory(packCode)
    if (fetchResult.kind !== "ok") {
      if (isTestingMode.value) return CORRECT_STATE.TESTING
      showError(resolveMaterialLookupError(fetchResult.error))
      return null
    }
    const scannedMaterialId  = String(fetchResult.materialInventory.material_idno ?? "").trim()
    const expectedMaterialId = String(row.materialIdno ?? "").trim()
    if (!isTestingMode.value && (!scannedMaterialId || scannedMaterialId !== expectedMaterialId)) {
      showError(`料號不符：站位 ${targetSlotIdno} 應為 ${expectedMaterialId}`)
      return null
    }
    return CORRECT_STATE.MATCHED
  }

  return {
    resolveExistenceBasedCorrectState,
    validateUnloadMaterialPackCode,
    resolveReplacementCorrectState,
  }
}

export type MaterialValidator = ReturnType<typeof createMaterialValidator>
