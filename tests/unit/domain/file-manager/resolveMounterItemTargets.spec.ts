import { resolveMounterItemTargets } from "@/domain/file-manager/resolveMounterItemTargets"

describe("resolveMounterItemTargets", () => {
    it("returns both B and T targets when idB and idT exist", () => {
        expect(
            resolveMounterItemTargets({
                idB: 10,
                idT: 20,
            })
        ).toEqual([
            { id: 10, side: "B" },
            { id: 20, side: "T" },
        ])
    })

    it("returns only B target when only idB exists", () => {
        expect(
            resolveMounterItemTargets({
                idB: 10,
            })
        ).toEqual([{ id: 10, side: "B" }])
    })

    it("returns only T target when only idT exists", () => {
        expect(
            resolveMounterItemTargets({
                idT: 20,
            })
        ).toEqual([{ id: 20, side: "T" }])
    })

    it("falls back to row id and normalized board side", () => {
        expect(
            resolveMounterItemTargets({
                id: 30,
                boardSide: "TOP",
            })
        ).toEqual([{ id: 30, side: "T" }])
    })

    it("defaults fallback side to B when board side is unknown", () => {
        expect(
            resolveMounterItemTargets({
                id: 30,
                boardSide: "X",
            })
        ).toEqual([{ id: 30, side: "B" }])
    })

    it("returns empty when no available ids", () => {
        expect(resolveMounterItemTargets({})).toEqual([])
    })
})
