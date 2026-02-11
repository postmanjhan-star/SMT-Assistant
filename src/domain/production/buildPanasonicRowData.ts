import {
    CheckMaterialMatchEnum,
    FeedMaterialTypeEnum,
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
    correct: CheckMaterialMatchEnum | null
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
    material_pack_code?: string | null
    feed_material_pack_type?: FeedMaterialTypeEnum | null
    check_pack_code_match?: CheckMaterialMatchEnum | null
}

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
            material_pack_code: log.material_pack_code,
            feed_material_pack_type: log.feed_material_pack_type,
            check_pack_code_match: log.check_pack_code_match,
        }
        recordMap.set(toRecordKey(normalized, index), normalized)
    })

    return Array.from(recordMap.values())
}

const getLatestInspection = (records: FeedRecordLike[]) => {
    return records
        .filter(
            record =>
                record.feed_material_pack_type ===
                FeedMaterialTypeEnum.INSPECTION_MATERIAL_PACK
        )
        .sort((a, b) => {
            const timeA = a.operation_time
                ? new Date(a.operation_time).getTime()
                : 0
            const timeB = b.operation_time
                ? new Date(b.operation_time).getTime()
                : 0
            return timeB - timeA
        })[0]
}

const getAppendedCodes = (records: FeedRecordLike[]) => {
    const codes = records
        .filter(
            record =>
                record.feed_material_pack_type ===
                    FeedMaterialTypeEnum.REUSED_MATERIAL_PACK ||
                record.feed_material_pack_type ===
                    FeedMaterialTypeEnum.NEW_MATERIAL_PACK
        )
        .map(record => record.material_pack_code)
        .filter((code): code is string => !!code && code.trim().length > 0)

    return Array.from(new Set(codes)).join(", ")
}

const getFirstAppendTime = (
    importRecord: FeedRecordLike | undefined,
    feedRecords: FeedRecordLike[]
) => {
    if (importRecord?.operation_time) return importRecord.operation_time
    return feedRecords[0]?.operation_time ?? null
}

/**
 * buildProductionRowData 是「把後端生產資料轉換成前端可顯示 RowModel」的唯一入口。
 * 不關心 UI / API / Vue，只負責資料結構轉換與商業規則套用。
 *
 * What it does:
 * 1. 合併 stats 與 logs 的 feed records（依 slot/subSlot + record.id，logs 覆蓋）
 * 2. 分類 feed 類型（IMPORTED / NEW / REUSED / INSPECTION）
 * 3. 推導最新巡檢資料（inspect* + count）
 * 4. correct = IMPORTED_MATERIAL_PACK.check_pack_code_match
 * 5. 組裝 appendedMaterialInventoryIdno（NEW/REUSED 去重串接）
 * 6. 推導 firstAppendTime（imported > 第一筆 record > null）
 * 7. remark = 巡檢次數（無則空字串）
 * 8. 輸出 RowModel 給 AG Grid 使用
 */
export const buildProductionRowData = (
    stats: PanasonicMounterItemStatRead[],
    logs: PanasonicItemStatFeedLogRead[]
): ProductionRowModel[] => {
    return stats.map(stat => {
        const baseRecords =
            (stat.feed_records as FeedRecordLike[] | undefined) ?? []
        const matchedLogs = logs.filter(
            log =>
                String(log.slot_idno) === String(stat.slot_idno) &&
                (log.sub_slot_idno ?? "") === (stat.sub_slot_idno ?? "")
        )

        const feedRecords = mergeFeedRecords(baseRecords, matchedLogs)

        const inspectionRecords = feedRecords.filter(
            record =>
                record.feed_material_pack_type ===
                FeedMaterialTypeEnum.INSPECTION_MATERIAL_PACK
        )
        const inspectionCount = inspectionRecords.length
        const latestInspection = getLatestInspection(feedRecords)

        const importRecord = feedRecords.find(
            record =>
                record.feed_material_pack_type ===
                FeedMaterialTypeEnum.IMPORTED_MATERIAL_PACK
        )

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
