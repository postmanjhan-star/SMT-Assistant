import {
    mergeMounterFiles,
    normalizeBoardSide,
    type MounterFileRowInput,
} from "@/domain/file-manager/mergeMounterFiles"

const buildRow = (overrides: Partial<MounterFileRowInput>): MounterFileRowInput => ({
    id: 1,
    product_idno: "P1",
    product_ver: "V1",
    board_side: "B",
    created_at: "2026-01-01",
    updated_at: "2026-01-02",
    uploader: "uploader-1",
    mounter_idno: "M1",
    ...overrides,
})

describe("normalizeBoardSide", () => {
    it("normalizes B/T aliases", () => {
        expect(normalizeBoardSide("B")).toBe("B")
        expect(normalizeBoardSide("bottom")).toBe("B")
        expect(normalizeBoardSide("T")).toBe("T")
        expect(normalizeBoardSide("TOP")).toBe("T")
    })

    it("returns null for unsupported side", () => {
        expect(normalizeBoardSide("X")).toBeNull()
        expect(normalizeBoardSide(null)).toBeNull()
    })
})

describe("mergeMounterFiles", () => {
    it("merges B and T rows with same product and version into one B+T row", () => {
        const rows = [
            buildRow({ id: 11, board_side: "B" }),
            buildRow({ id: 22, board_side: "T" }),
        ]

        const merged = mergeMounterFiles(rows)

        expect(merged).toHaveLength(1)
        expect(merged[0]).toMatchObject({
            id: 11,
            id_b: 11,
            id_t: 22,
            product_idno: "P1",
            product_ver: "V1",
            board_side: "B+T",
        })
    })

    it("keeps single-side rows as-is", () => {
        const rows = [buildRow({ id: 11, board_side: "B" })]

        const merged = mergeMounterFiles(rows)

        expect(merged).toHaveLength(1)
        expect(merged[0]).toMatchObject({
            id: 11,
            id_b: 11,
            id_t: undefined,
            board_side: "B",
        })
    })

    it("does not merge when both rows are same side", () => {
        const rows = [
            buildRow({ id: 11, board_side: "B" }),
            buildRow({ id: 12, board_side: "B" }),
        ]

        const merged = mergeMounterFiles(rows)

        expect(merged).toHaveLength(2)
        expect(merged.map((row) => row.board_side)).toEqual(["B", "B"])
    })

    it("does not merge when group has more than two rows", () => {
        const rows = [
            buildRow({ id: 11, board_side: "B" }),
            buildRow({ id: 22, board_side: "T" }),
            buildRow({ id: 33, board_side: "B" }),
        ]

        const merged = mergeMounterFiles(rows)

        expect(merged).toHaveLength(3)
        expect(merged.map((row) => row.board_side)).toEqual(["B", "T", "B"])
    })

    it("supports TOP/BOTTOM side values and merges correctly", () => {
        const rows = [
            buildRow({ id: 11, board_side: "BOTTOM" }),
            buildRow({ id: 22, board_side: "TOP" }),
        ]

        const merged = mergeMounterFiles(rows)

        expect(merged).toHaveLength(1)
        expect(merged[0]).toMatchObject({
            board_side: "B+T",
            id_b: 11,
            id_t: 22,
        })
    })

    it("only merges rows with same product and same version", () => {
        const rows = [
            buildRow({ id: 11, product_idno: "P1", product_ver: "V1", board_side: "B" }),
            buildRow({ id: 22, product_idno: "P1", product_ver: "V2", board_side: "T" }),
        ]

        const merged = mergeMounterFiles(rows)

        expect(merged).toHaveLength(2)
        expect(merged.map((row) => row.board_side)).toEqual(["B", "T"])
    })
})
