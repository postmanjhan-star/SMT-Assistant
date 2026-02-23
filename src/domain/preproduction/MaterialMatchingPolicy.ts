export type MaterialMatchRow = {
    materialIdno: string
    materialInventoryIdno?: string | null
    correct?: string | null
}

export function filterUnboundRows<T extends MaterialMatchRow>(
    rows: T[],
    materialIdno: string
): T[] {
    return rows.filter(
        row =>
            row.materialIdno === materialIdno &&
            (!row.materialInventoryIdno || row.correct !== "true")
    )
}

export const MaterialMatchingPolicy = {
    filterUnboundRows,
}
