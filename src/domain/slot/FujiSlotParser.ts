export type ParsedFujiSlot = {
    machineIdno: string
    stage: "A" | "B" | "C" | "D"
    slot: number
}

export function parseFujiSlotIdno(slotIdno: string): ParsedFujiSlot | null {
    const parts = slotIdno.split("-")
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
