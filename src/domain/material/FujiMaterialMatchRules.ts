import { CheckMaterialMatchEnum } from '@/domain/shared/domainEnums'

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
