import {
    CheckMaterialMatchEnum,
    FeedMaterialTypeEnum,
    MaterialOperationTypeEnum,
} from "@/domain/shared/domainEnums"
import type { PanasonicItemStatFeedLogInput, PanasonicMounterItemStatInput } from "@/domain/shared/inputTypes"
import {
    filterInspectionRecords,
    getLatestInspectionRecord,
    getLatestOperatorId,
    resolveProductionPackState,
} from "@/domain/production/sharedProductionHelpers"

function normalizeFeedMaterialPackType(value: string | null | undefined): string | null {
    if (!value) return null
    const upper = value.toUpperCase().trim()
    if (upper.includes("NEW")) return FeedMaterialTypeEnum.NEW_MATERIAL_PACK
    if (upper.includes("IMPORT")) return FeedMaterialTypeEnum.IMPORTED_MATERIAL_PACK
    if (upper.includes("REUSE")) return FeedMaterialTypeEnum.REUSED_MATERIAL_PACK
    if (upper.includes("INSPECT")) return FeedMaterialTypeEnum.INSPECTION_MATERIAL_PACK
    return value
}

export type ProductionRowModel = {
    id: number
    slotIdno: string
    subSlotIdno: string | null
    materialIdno: string
    operatorIdno?: string | null
    materialInventoryIdno: string | null
    appendedMaterialInventoryIdno: string
    spliceMaterialInventoryIdno?: string | null
    total?: number | string
    correct: string | null
    operationTime?: string | null
    inspectMaterialPackCode?: string
    inspectTime?: string | null
    inspectCount?: number
    inspectorIdno?: string | null
    remark?: string
}

type FeedRecordLike = {
    id?: number
    feed_record_id?: number
    operation_time?: string
    material_idno?: string | null
    material_pack_code?: string | null
    operation_type?: string | null
    feed_material_pack_type?: string | null
    check_pack_code_match?: string | null
    operator_id?: string | null
}

const toRecordKey = (record: FeedRecordLike, index: number) => {
    if (record.id != null) return `id:${record.id}`
    if (record.feed_record_id != null) return `id:${record.feed_record_id}`
    return `idx:${index}`
}

const mergeFeedRecords = (
    feedRecords: FeedRecordLike[],
    logs: PanasonicItemStatFeedLogInput[]
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
            operator_id: log.operator_id,
        }
        recordMap.set(toRecordKey(normalized, index), normalized)
    })

    return Array.from(recordMap.values())
}


export const buildProductionRowData = (
    stats: PanasonicMounterItemStatInput[],
    logs: PanasonicItemStatFeedLogInput[]
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
        const normalizedFeedRecords = feedRecords.map((r) => ({
            ...r,
            feed_material_pack_type: normalizeFeedMaterialPackType(r.feed_material_pack_type),
        }))

        const inspectionRecords = filterInspectionRecords(normalizedFeedRecords)
        const inspectionCount = inspectionRecords.length
        const latestInspection = getLatestInspectionRecord(inspectionRecords)
        const resolvedPackState = resolveProductionPackState(normalizedFeedRecords)
        const operatorIdno = getLatestOperatorId(normalizedFeedRecords)

        // 向後相容：舊接料/換料紀錄的 check_pack_code_match 為 null，
        // 但只有 NEW/REUSED 類型才補預設值；IMPORTED（生產開始）保留 null
        const latestType = resolvedPackState.latestActiveRecord?.feed_material_pack_type
        const isSpliceOrReplaceRecord =
            latestType === FeedMaterialTypeEnum.NEW_MATERIAL_PACK ||
            latestType === FeedMaterialTypeEnum.REUSED_MATERIAL_PACK
        const latestActiveCorrect =
            resolvedPackState.latestActiveCorrect ??
            (isSpliceOrReplaceRecord ? CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK : null)

        return {
            id: stat.id,
            slotIdno: stat.slot_idno ?? "",
            subSlotIdno: stat.sub_slot_idno ?? null,
            materialIdno: stat.material_idno ?? "",
            operatorIdno,
            materialInventoryIdno: resolvedPackState.firstLoadedPackCode,
            appendedMaterialInventoryIdno: resolvedPackState.currentLoadedPackCode ?? "",
            spliceMaterialInventoryIdno: resolvedPackState.currentSplicePackCode,
            correct:
                resolvedPackState.currentLoadedPackCode != null
                    ? latestActiveCorrect
                    : resolvedPackState.lastMainOperation === MaterialOperationTypeEnum.UNFEED
                      ? "UNLOADED_MATERIAL_PACK"
                      : null,
            operationTime: resolvedPackState.currentLoadedRecord?.operation_time ?? null,
            inspectMaterialPackCode: latestInspection?.material_pack_code ?? "",
            inspectTime: latestInspection?.operation_time ?? null,
            inspectCount: inspectionCount,
            remark: inspectionCount > 0 ? `巡檢 ${inspectionCount} 次` : "",
        }
    })
}
