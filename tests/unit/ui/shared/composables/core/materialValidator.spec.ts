import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { CheckMaterialMatchEnum } from '@/client'
import { createMaterialValidator } from '@/ui/shared/composables/core/flows/materialValidator'
import { CORRECT_STATE } from '@/ui/shared/composables/core/flows/materialPackCodeHelpers'
import type { MaterialRepositoryResult } from '@/application/barcode-scan/BarcodeScanDeps'

function okResult(materialIdno = 'MAT-001'): MaterialRepositoryResult {
  return {
    kind: 'ok',
    materialInventory: { material_idno: materialIdno } as any,
  }
}

function errorResult(): MaterialRepositoryResult {
  return {
    kind: 'error',
    errorKind: 'NOT_FOUND' as any,
    error: new Error('not found'),
  }
}

type Setup = {
  isTestingMode?: boolean
  isMockMode?: boolean
  fetchResult?: MaterialRepositoryResult | Promise<MaterialRepositoryResult>
  row?: any
}

function makeValidator(setup: Setup = {}) {
  const showError = vi.fn()
  const fetchMaterialInventory = vi.fn().mockResolvedValue(setup.fetchResult ?? okResult())
  const findRowBySlotIdno = vi
    .fn()
    .mockReturnValue('row' in setup ? setup.row : { materialIdno: 'MAT-001' })
  const validator = createMaterialValidator({
    isTestingMode: ref(setup.isTestingMode ?? false),
    isMockMode: setup.isMockMode ?? false,
    fetchMaterialInventory,
    showError,
    findRowBySlotIdno,
  })
  return { validator, showError, fetchMaterialInventory, findRowBySlotIdno }
}

describe('createMaterialValidator', () => {
  describe('resolveExistenceBasedCorrectState', () => {
    it('空字串 → 錯誤並回傳 null', async () => {
      const { validator, showError, fetchMaterialInventory } = makeValidator()
      const result = await validator.resolveExistenceBasedCorrectState('   ')
      expect(result).toBeNull()
      expect(showError).toHaveBeenCalledWith('請先輸入物料條碼')
      expect(fetchMaterialInventory).not.toHaveBeenCalled()
    })

    it('mock 模式且非 testing → 直接回 MATCHED 不查 ERP', async () => {
      const { validator, fetchMaterialInventory } = makeValidator({ isMockMode: true })
      const result = await validator.resolveExistenceBasedCorrectState('PACK-01')
      expect(result).toBe(CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK)
      expect(fetchMaterialInventory).not.toHaveBeenCalled()
    })

    it('mock 模式 + testing → 仍查 ERP', async () => {
      const { validator, fetchMaterialInventory } = makeValidator({
        isMockMode: true,
        isTestingMode: true,
      })
      await validator.resolveExistenceBasedCorrectState('PACK-01')
      expect(fetchMaterialInventory).toHaveBeenCalledWith('PACK-01')
    })

    it('ERP 查到 → MATCHED', async () => {
      const { validator } = makeValidator()
      const result = await validator.resolveExistenceBasedCorrectState('PACK-01')
      expect(result).toBe(CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK)
    })

    it('ERP 查無 + testing → TESTING', async () => {
      const { validator, showError } = makeValidator({
        isTestingMode: true,
        fetchResult: errorResult(),
      })
      const result = await validator.resolveExistenceBasedCorrectState('PACK-01')
      expect(result).toBe(CheckMaterialMatchEnum.TESTING_MATERIAL_PACK)
      expect(showError).not.toHaveBeenCalled()
    })

    it('ERP 查無 + 正式 → showError 並回傳 null', async () => {
      const { validator, showError } = makeValidator({ fetchResult: errorResult() })
      const result = await validator.resolveExistenceBasedCorrectState('PACK-01')
      expect(result).toBeNull()
      expect(showError).toHaveBeenCalled()
    })
  })

  describe('validateUnloadMaterialPackCode', () => {
    it('空字串 → false + 錯誤', async () => {
      const { validator, showError } = makeValidator()
      expect(await validator.validateUnloadMaterialPackCode('')).toBe(false)
      expect(showError).toHaveBeenCalledWith('請先輸入物料條碼')
    })

    it('testing 模式 → 直接 true 不查 ERP', async () => {
      const { validator, fetchMaterialInventory } = makeValidator({ isTestingMode: true })
      expect(await validator.validateUnloadMaterialPackCode('PACK-01')).toBe(true)
      expect(fetchMaterialInventory).not.toHaveBeenCalled()
    })

    it('mock 模式 → 直接 true 不查 ERP', async () => {
      const { validator, fetchMaterialInventory } = makeValidator({ isMockMode: true })
      expect(await validator.validateUnloadMaterialPackCode('PACK-01')).toBe(true)
      expect(fetchMaterialInventory).not.toHaveBeenCalled()
    })

    it('ERP 查到 → true', async () => {
      const { validator } = makeValidator()
      expect(await validator.validateUnloadMaterialPackCode('PACK-01')).toBe(true)
    })

    it('ERP 查無 → false + 錯誤', async () => {
      const { validator, showError } = makeValidator({ fetchResult: errorResult() })
      expect(await validator.validateUnloadMaterialPackCode('PACK-01')).toBe(false)
      expect(showError).toHaveBeenCalled()
    })
  })

  describe('resolveReplacementCorrectState', () => {
    it('空 pack code → 錯誤', async () => {
      const { validator, showError } = makeValidator()
      const result = await validator.resolveReplacementCorrectState('  ', 'SLOT-01')
      expect(result).toBeNull()
      expect(showError).toHaveBeenCalledWith('請先輸入物料條碼')
    })

    it('找不到 row → 錯誤', async () => {
      const { validator, showError } = makeValidator({ row: null })
      const result = await validator.resolveReplacementCorrectState('PACK-01', 'SLOT-01')
      expect(result).toBeNull()
      expect(showError).toHaveBeenCalledWith('找不到槽位 SLOT-01')
    })

    it('mock 模式且非 testing → MATCHED', async () => {
      const { validator, fetchMaterialInventory } = makeValidator({ isMockMode: true })
      const result = await validator.resolveReplacementCorrectState('PACK-01', 'SLOT-01')
      expect(result).toBe(CORRECT_STATE.MATCHED)
      expect(fetchMaterialInventory).not.toHaveBeenCalled()
    })

    it('testing 模式 + ERP 查到 → MATCHED（不套容差）', async () => {
      const { validator } = makeValidator({
        isTestingMode: true,
        fetchResult: okResult('MAT-001'),
        row: { materialIdno: 'MAT-001' },
      })
      const result = await validator.resolveReplacementCorrectState('PACK-01', 'SLOT-01')
      expect(result).toBe(CORRECT_STATE.MATCHED)
    })

    it('testing 模式 + ERP 查無 → TESTING（容差時機）', async () => {
      const { validator, showError } = makeValidator({
        isTestingMode: true,
        fetchResult: errorResult(),
      })
      const result = await validator.resolveReplacementCorrectState('PACK-01', 'SLOT-01')
      expect(result).toBe(CORRECT_STATE.TESTING)
      expect(showError).not.toHaveBeenCalled()
    })

    it('ERP 查無 + 正式 → 錯誤', async () => {
      const { validator, showError } = makeValidator({ fetchResult: errorResult() })
      const result = await validator.resolveReplacementCorrectState('PACK-01', 'SLOT-01')
      expect(result).toBeNull()
      expect(showError).toHaveBeenCalled()
    })

    it('ERP 料號不符（正式）→ 錯誤', async () => {
      const { validator, showError } = makeValidator({
        fetchResult: okResult('MAT-002'),
        row: { materialIdno: 'MAT-001' },
      })
      const result = await validator.resolveReplacementCorrectState('PACK-01', 'SLOT-01')
      expect(result).toBeNull()
      expect(showError).toHaveBeenCalledWith('料號不符：站位 SLOT-01 應為 MAT-001')
    })

    it('ERP 料號不符但 testing → MATCHED（容差）', async () => {
      const { validator, showError } = makeValidator({
        isTestingMode: true,
        fetchResult: okResult('MAT-002'),
        row: { materialIdno: 'MAT-001' },
      })
      const result = await validator.resolveReplacementCorrectState('PACK-01', 'SLOT-01')
      expect(result).toBe(CORRECT_STATE.MATCHED)
      expect(showError).not.toHaveBeenCalled()
    })
  })
})
