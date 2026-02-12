export type ParsedFujiSlot = {
    machineIdno: string
    stage: "A" | "B" | "C" | "D"
    slot: number
}

export function parseFujiSlotIdno(slotIdno: string): ParsedFujiSlot | null {
    const parts = slotIdno.trim().split("-")
    if (parts.length < 3) return null

    const machineIdno = parts[0]
    let stage = parts[1]

    if (stage === "1") stage = "A"
    if (stage === "2") stage = "B"
    if (stage === "3") stage = "C"
    if (stage === "4") stage = "D"

    const slot = Number(parts[2])
    if (!slot || !["A", "B", "C", "D"].includes(stage)) return null

    return { machineIdno, stage: stage as ParsedFujiSlot["stage"], slot }
}

export type ParsedFujiSlotInput = {
    slot: string
    subSlot: string
}

export function parseFujiSlotInput(raw: string): ParsedFujiSlotInput | null {
    const parsed = parseFujiSlotIdno(raw)
    if (!parsed) return null

    return {
        slot: `${parsed.machineIdno}-${parsed.stage}`,
        subSlot: String(parsed.slot),
    }
}
