import {
    CheckMaterialMatchEnum,
    FeedMaterialTypeEnum,
    MaterialOperationTypeEnum,
    PanasonicItemStatFeedLogRead,
    PanasonicMounterItemStatRead,
} from "@/client"

export type ProductionRowModel = {
    id: number
    slotIdno: string
    subSlotIdno: string | null
    materialIdno: string
    materialInventoryIdno: string | null
    appendedMaterialInventoryIdno: string
    total?: number | string
    correct: CheckMaterialMatchEnum | "UNLOADED_MATERIAL_PACK" | null
    firstAppendTime?: string | null
    inspectMaterialPackCode?: string
    inspectTime?: string | null
    inspectCount?: number
    remark?: string
}

type FeedRecordLike = {
    id?: number
    feed_record_id?: number
    operation_time?: string
    material_idno?: string | null
    material_pack_code?: string | null
    operation_type?: MaterialOperationTypeEnum | null
    feed_material_pack_type?: FeedMaterialTypeEnum | null
    check_pack_code_match?: CheckMaterialMatchEnum | null
}

type IndexedRecord = FeedRecordLike & { __index: number }

const toRecordKey = (record: FeedRecordLike, index: number) => {
    if (record.id != null) return `id:${record.id}`
    if (record.feed_record_id != null) return `id:${record.feed_record_id}`
    return `idx:${index}`
}

const mergeFeedRecords = (
    feedRecords: FeedRecordLike[],
    logs: PanasonicItemStatFeedLogRead[]
) => {
    const recordMap = new Map<string, FeedRecordLike>()

    feedRecords.forEach((record, index) => {
        recordMap.set(toRecordKey(record, index), record)
    })

    logs.forEach((log, index) => {
        const normalized: FeedRecordLike = {
            id: log.feed_record_id ?? log.id,
            feed_record_id: log.feed_record_id,
            operation_time: log.operation_time,
            material_idno: log.material_idno,
            material_pack_code: log.material_pack_code,
            operation_type: log.operation_type,
            feed_material_pack_type: log.feed_material_pack_type,
            check_pack_code_match: log.check_pack_code_match,
        }
        recordMap.set(toRecordKey(normalized, index), normalized)
    })

    return Array.from(recordMap.values())
}

const toOperationType = (value: unknown): MaterialOperationTypeEnum => {
    if (value == null) return MaterialOperationTypeEnum.FEED
    return value as MaterialOperationTypeEnum
}

const getTimeValue = (value: string | undefined): number => {
    if (!value) return 0
    const t = new Date(value).getTime()
    return Number.isFinite(t) ? t : 0
}

const toSortedRecords = (records: FeedRecordLike[]): IndexedRecord[] => {
    return records
        .map((record, index) => ({ ...record, __index: index }))
        .sort((a, b) => {
            const timeDiff = getTimeValue(a.operation_time) - getTimeValue(b.operation_time)
            if (timeDiff !== 0) return timeDiff

            const aId = a.feed_record_id ?? a.id ?? Number.MAX_SAFE_INTEGER
            const bId = b.feed_record_id ?? b.id ?? Number.MAX_SAFE_INTEGER
            if (aId !== bId) return aId - bId

            return a.__index - b.__index
        })
}

const getLatestInspection = (records: FeedRecordLike[]) => {
    return records
        .filter((record) => {
            return (
                toOperationType(record.operation_type) === MaterialOperationTypeEnum.FEED &&
                record.feed_material_pack_type ===
                    FeedMaterialTypeEnum.INSPECTION_MATERIAL_PACK
            )
        })
        .sort((a, b) => getTimeValue(b.operation_time) - getTimeValue(a.operation_time))[0]
}

const normalizeValue = (value: unknown): string => String(value ?? "").trim()

const getActiveImportedRecord = (
    records: FeedRecordLike[]
): IndexedRecord | undefined => {
    let activeImport: IndexedRecord | undefined

    toSortedRecords(records).forEach((record) => {
        const operationType = toOperationType(record.operation_type)
        const feedType = record.feed_material_pack_type
        const packCode = normalizeValue(record.material_pack_code)
        const materialIdno = normalizeValue(record.material_idno)

        if (
            operationType === MaterialOperationTypeEnum.FEED &&
            feedType === FeedMaterialTypeEnum.IMPORTED_MATERIAL_PACK
        ) {
            activeImport = record
            return
        }

        if (
            operationType === MaterialOperationTypeEnum.UNFEED &&
            activeImport
        ) {
            const activePackCode = normalizeValue(activeImport.material_pack_code)
            const activeMaterialIdno = normalizeValue(activeImport.material_idno)
            const samePackCode = !!packCode && activePackCode === packCode
            const sameMaterialIdno = !!materialIdno && activeMaterialIdno === materialIdno

            if (samePackCode || sameMaterialIdno) {
                activeImport = undefined
            }
        }
    })

    return activeImport
}

const getAppendedCodes = (records: FeedRecordLike[]) => {
    const appendedCodes = new Set<string>()

    toSortedRecords(records).forEach((record) => {
        const operationType = toOperationType(record.operation_type)
        const code = String(record.material_pack_code ?? "").trim()
        if (!code) return

        if (operationType === MaterialOperationTypeEnum.UNFEED) {
            appendedCodes.delete(code)
            return
        }

        const feedType = record.feed_material_pack_type
        if (
            feedType === FeedMaterialTypeEnum.NEW_MATERIAL_PACK ||
            feedType === FeedMaterialTypeEnum.REUSED_MATERIAL_PACK
        ) {
            appendedCodes.add(code)
        }
    })

    return Array.from(appendedCodes).join(", ")
}

const getFirstAppendTime = (
    importRecord: FeedRecordLike | undefined,
    feedRecords: FeedRecordLike[]
) => {
    if (importRecord?.operation_time) return importRecord.operation_time

    const first = toSortedRecords(feedRecords)[0]
    return first?.operation_time ?? null
}

export const buildProductionRowData = (
    stats: PanasonicMounterItemStatRead[],
    logs: PanasonicItemStatFeedLogRead[]
): ProductionRowModel[] => {
    return stats.map((stat) => {
        const baseRecords =
            (stat.feed_records as FeedRecordLike[] | undefined) ?? []
        const matchedLogs = logs.filter(
            (log) =>
                String(log.slot_idno) === String(stat.slot_idno) &&
                (log.sub_slot_idno ?? "") === (stat.sub_slot_idno ?? "")
        )

        const feedRecords = mergeFeedRecords(baseRecords, matchedLogs)

        const inspectionRecords = feedRecords.filter((record) => {
            return (
                toOperationType(record.operation_type) === MaterialOperationTypeEnum.FEED &&
                record.feed_material_pack_type ===
                    FeedMaterialTypeEnum.INSPECTION_MATERIAL_PACK
            )
        })

        const inspectionCount = inspectionRecords.length
        const latestInspection = getLatestInspection(feedRecords)

        const importRecord = getActiveImportedRecord(feedRecords)

        return {
            id: stat.id,
            slotIdno: stat.slot_idno ?? "",
            subSlotIdno: stat.sub_slot_idno ?? null,
            materialIdno: stat.material_idno ?? "",
            materialInventoryIdno: importRecord?.material_pack_code ?? null,
            appendedMaterialInventoryIdno: getAppendedCodes(feedRecords),
            correct: importRecord?.check_pack_code_match ?? null,
            firstAppendTime: getFirstAppendTime(importRecord, feedRecords),
            inspectMaterialPackCode: latestInspection?.material_pack_code ?? "",
            inspectTime: latestInspection?.operation_time ?? null,
            inspectCount: inspectionCount,
            remark: inspectionCount > 0 ? `巡檢 ${inspectionCount} 次` : "",
        }
    })
}
