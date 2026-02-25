export type MounterFileRowInput = {
    id?: number | null
    product_idno: string
    product_ver: string
    board_side?: string | null
    created_at: string
    updated_at?: string | null
    uploader?: string | null
    mounter_idno: string
}

export type MergedMounterFileRow = {
    id: number | null | undefined
    id_b?: number | null
    id_t?: number | null
    product_idno: string
    product_ver: string
    board_side: string
    created_at: string
    updated_at: string
    uploader: string
    mounter_idno: string
}

export const normalizeBoardSide = (
    side: string | null | undefined
): "B" | "T" | null => {
    if (!side) return null
    const normalized = side.trim().toUpperCase()
    if (normalized === "B" || normalized === "BOTTOM") return "B"
    if (normalized === "T" || normalized === "TOP") return "T"
    return null
}

const toMergedSingleRow = (row: MounterFileRowInput): MergedMounterFileRow => {
    const normalizedSide = normalizeBoardSide(row.board_side)
    return {
        id: row.id,
        id_b: normalizedSide === "B" ? row.id : undefined,
        id_t: normalizedSide === "T" ? row.id : undefined,
        product_idno: row.product_idno,
        product_ver: row.product_ver,
        board_side: normalizedSide ?? String(row.board_side ?? ""),
        created_at: row.created_at,
        updated_at: row.updated_at ?? "",
        uploader: row.uploader ?? "",
        mounter_idno: row.mounter_idno,
    }
}

export const mergeMounterFiles = (
    rows: MounterFileRowInput[]
): MergedMounterFileRow[] => {
    const grouped = new Map<string, MounterFileRowInput[]>()

    rows.forEach((row) => {
        const key = `${row.product_idno}|${row.product_ver}`
        const existing = grouped.get(key) ?? []
        existing.push(row)
        grouped.set(key, existing)
    })

    const mergedRows: MergedMounterFileRow[] = []

    grouped.forEach((groupRows) => {
        if (groupRows.length === 1) {
            mergedRows.push(toMergedSingleRow(groupRows[0]))
            return
        }

        if (groupRows.length === 2) {
            const bRow = groupRows.find(
                (item) => normalizeBoardSide(item.board_side) === "B"
            )
            const tRow = groupRows.find(
                (item) => normalizeBoardSide(item.board_side) === "T"
            )

            if (bRow && tRow) {
                mergedRows.push({
                    id: bRow.id ?? tRow.id,
                    id_b: bRow.id,
                    id_t: tRow.id,
                    product_idno: bRow.product_idno || tRow.product_idno,
                    product_ver: bRow.product_ver || tRow.product_ver,
                    board_side: "B+T",
                    created_at: bRow.created_at || tRow.created_at,
                    updated_at: bRow.updated_at ?? tRow.updated_at ?? "",
                    uploader: bRow.uploader ?? tRow.uploader ?? "",
                    mounter_idno: bRow.mounter_idno || tRow.mounter_idno,
                })
                return
            }
        }

        groupRows.forEach((row) => {
            mergedRows.push(toMergedSingleRow(row))
        })
    })

    return mergedRows
}
