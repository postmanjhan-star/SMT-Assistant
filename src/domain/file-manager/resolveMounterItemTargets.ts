import { normalizeBoardSide } from "@/domain/file-manager/mergeMounterFiles"

export type MounterItemTarget = {
    id: number
    side: "B" | "T"
}

export type ResolveMounterItemTargetInput = {
    id?: number | null
    boardSide?: string | null
    idB?: number | null
    idT?: number | null
}

export const resolveMounterItemTargets = ({
    id,
    boardSide,
    idB,
    idT,
}: ResolveMounterItemTargetInput): MounterItemTarget[] => {
    if (idB != null && idT != null) {
        return [
            { id: idB, side: "B" },
            { id: idT, side: "T" },
        ]
    }

    if (idB != null) {
        return [{ id: idB, side: "B" }]
    }

    if (idT != null) {
        return [{ id: idT, side: "T" }]
    }

    if (id != null) {
        return [
            {
                id,
                side: normalizeBoardSide(boardSide) ?? "B",
            },
        ]
    }

    return []
}
