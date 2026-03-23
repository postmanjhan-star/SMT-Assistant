// eslint-disable-next-line no-restricted-imports -- [Phase-1 whitelist] tracked in REFACTORING_BASELINE.md, fix in Phase 2 (Domain 純化)
import { CheckMaterialMatchEnum } from '@/client'

export function findAvailableMaterialRows<
    T extends {
        materialIdno: string
        materialInventoryIdno: string | null
        correct: CheckMaterialMatchEnum | null
    }
>(rows: T[], materialIdno: string): T[] {
    return rows.filter(
        row =>
            row.materialIdno === materialIdno &&
            (!row.materialInventoryIdno ||
                row.correct !== CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK)
    )
}
