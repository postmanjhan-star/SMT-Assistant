import { formatSlotIdno } from "@/domain/slot/SlotBindingRules"

export type SlotId = {
    slotIdno: string
    subSlotIdno?: string | null
}

export type FeedRecordLike = {
    feedMaterialPackType: string
    materialPackCode?: string | null
}

export type StatLike = SlotId & {
    feedRecords?: FeedRecordLike[]
}

export type InspectionScanInput = {
    productionStarted: boolean
    stat: StatLike
    importPackType: string
    inputPackIdno: string
}

export type LoadedSlotLookupInput = {
    stats: StatLike[]
    importPackType: string
    inputPackIdno: string
}

export const isInspectionScan = ({
    productionStarted,
    stat,
    importPackType,
    inputPackIdno,
}: InspectionScanInput): boolean => {
    if (!productionStarted) return false

    const importPack = stat.feedRecords?.find(
        r => r.feedMaterialPackType === importPackType
    )

    if (!importPack) return false

    return importPack.materialPackCode === inputPackIdno
}

export const findLoadedSlotByPack = ({
    stats,
    importPackType,
    inputPackIdno,
}: LoadedSlotLookupInput): SlotId | null => {
    const loadedStat = stats.find(stat =>
        stat.feedRecords?.some(
            r =>
                r.feedMaterialPackType === importPackType &&
                r.materialPackCode === inputPackIdno
        )
    )

    if (!loadedStat) return null

    return {
        slotIdno: loadedStat.slotIdno,
        subSlotIdno: loadedStat.subSlotIdno ?? null,
    }
}

export const appendMaterialCode = (
    existing: string | null | undefined,
    newCode?: string | null
): string => {
    const oldValue = existing?.trim() || ""
    const currentCodes = oldValue
        ? oldValue.split(",").map(s => s.trim())
        : []

    if (newCode && !currentCodes.includes(newCode)) {
        currentCodes.push(newCode)
    }

    return currentCodes.join(", ")
}

export const formatSlotId = (slot: SlotId): string => formatSlotIdno(slot)
