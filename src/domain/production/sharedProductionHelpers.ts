import { FeedMaterialTypeEnum, MaterialOperationTypeEnum } from "@/domain/shared/domainEnums"

/**
 * Minimal snake_case record shape required by all shared production helpers.
 * Both FujiFeedRecordLike (after normalization) and Panasonic FeedRecordLike satisfy this
 * via TypeScript structural typing.
 */
export type FeedRecordBase = {
  id?: number
  feed_record_id?: number
  operation_time?: string
  material_idno?: string | null
  material_pack_code?: string | null
  operation_type?: string | null
  feed_material_pack_type?: string | null
  operator_id?: string | null
}

export type SortedFeedRecord<T extends FeedRecordBase> = T & { __index: number }

export type ResolvedProductionPackState<T extends FeedRecordBase> = {
  firstLoadedRecord: SortedFeedRecord<T> | null
  firstLoadedPackCode: string | null
  currentLoadedRecord: SortedFeedRecord<T> | null
  currentLoadedPackCode: string | null
  currentSpliceRecord: SortedFeedRecord<T> | null
  currentSplicePackCode: string | null
  latestActiveRecord: SortedFeedRecord<T> | null
  latestActiveCorrect: string | null
  lastMainOperation: MaterialOperationTypeEnum | null
}

export function normalizeValue(value: unknown): string {
  return String(value ?? "").trim()
}

export function getTimeValue(value: string | null | undefined): number {
  if (!value) return 0
  const t = new Date(value).getTime()
  return Number.isFinite(t) ? t : 0
}

export function toSortedRecords<T extends FeedRecordBase>(records: T[]): SortedFeedRecord<T>[] {
  return records
    .map((r, i) => ({ ...r, __index: i }) as SortedFeedRecord<T>)
    .sort((a, b) => {
      const timeDiff = getTimeValue(a.operation_time) - getTimeValue(b.operation_time)
      if (timeDiff !== 0) return timeDiff

      const aId = a.feed_record_id ?? a.id ?? Number.MAX_SAFE_INTEGER
      const bId = b.feed_record_id ?? b.id ?? Number.MAX_SAFE_INTEGER
      if (aId !== bId) return aId - bId

      return a.__index - b.__index
    })
}

export function isCorrectFeedType(value: string | null | undefined): boolean {
  return (
    value === FeedMaterialTypeEnum.IMPORTED_MATERIAL_PACK ||
    value === FeedMaterialTypeEnum.NEW_MATERIAL_PACK ||
    value === FeedMaterialTypeEnum.REUSED_MATERIAL_PACK
  )
}

function normalizeCheckPackCodeMatch(value: string | null | undefined): string | null {
  if (!value) return null
  if (value === "true") return "MATCHED_MATERIAL_PACK"
  if (value === "false") return "UNMATCHED_MATERIAL_PACK"
  if (value === "warning") return "TESTING_MATERIAL_PACK"
  return value
}

function normalizeOperationType(value: string | null | undefined): MaterialOperationTypeEnum {
  return value === MaterialOperationTypeEnum.UNFEED
    ? MaterialOperationTypeEnum.UNFEED
    : MaterialOperationTypeEnum.FEED
}

function isSameRecord(a: FeedRecordBase | null, b: FeedRecordBase | null): boolean {
  if (!a || !b) return false
  const aId = a.feed_record_id ?? a.id ?? null
  const bId = b.feed_record_id ?? b.id ?? null
  if (aId != null && bId != null) return aId === bId
  return (
    normalizeValue(a.material_pack_code) === normalizeValue(b.material_pack_code) &&
    normalizeValue(a.material_idno) === normalizeValue(b.material_idno) &&
    getTimeValue(a.operation_time) === getTimeValue(b.operation_time)
  )
}

function isRecordLater(a: FeedRecordBase | null, b: FeedRecordBase | null): boolean {
  if (!a) return false
  if (!b) return true

  const timeDiff = getTimeValue(a.operation_time) - getTimeValue(b.operation_time)
  if (timeDiff !== 0) return timeDiff > 0

  const aId = a.feed_record_id ?? a.id ?? Number.MAX_SAFE_INTEGER
  const bId = b.feed_record_id ?? b.id ?? Number.MAX_SAFE_INTEGER
  if (aId !== bId) return aId > bId

  const aIndex = (a as { __index?: number }).__index ?? 0
  const bIndex = (b as { __index?: number }).__index ?? 0
  return aIndex > bIndex
}

function recordMatchesTarget(
  record: FeedRecordBase | null,
  packCode: string,
  materialIdno: string
): boolean {
  if (!record) return false
  const recordPackCode = normalizeValue(record.material_pack_code)
  const recordMaterialIdno = normalizeValue(record.material_idno)
  return (
    (!!packCode && recordPackCode === packCode) ||
    (!!materialIdno && recordMaterialIdno === materialIdno)
  )
}

function recordMatchesPackCode(record: FeedRecordBase | null, packCode: string): boolean {
  if (!record || !packCode) return false
  return normalizeValue(record.material_pack_code) === packCode
}

export function resolveProductionPackState<
  T extends FeedRecordBase & { check_pack_code_match?: string | null }
>(records: T[]): ResolvedProductionPackState<T> {
  const sorted = toSortedRecords(records)
  let firstLoadedRecord: SortedFeedRecord<T> | null = null
  let currentLoadedRecord: SortedFeedRecord<T> | null = null
  let currentSpliceRecord: SortedFeedRecord<T> | null = null
  let lastMainOperation: MaterialOperationTypeEnum | null = null

  sorted.forEach((record) => {
    const operationType = normalizeOperationType(record.operation_type)
    const feedType = record.feed_material_pack_type
    const packCode = normalizeValue(record.material_pack_code)
    const materialIdno = normalizeValue(record.material_idno)

    if (operationType === MaterialOperationTypeEnum.FEED) {
      if (!isCorrectFeedType(feedType)) return
      if (!packCode) return

      if (
        !firstLoadedRecord &&
        feedType === FeedMaterialTypeEnum.IMPORTED_MATERIAL_PACK &&
        packCode
      ) {
        firstLoadedRecord = record
      }

      if (
        isSameRecord(currentLoadedRecord, record) ||
        recordMatchesPackCode(currentLoadedRecord, packCode)
      ) {
        currentLoadedRecord = record
        return
      }

      if (
        isSameRecord(currentSpliceRecord, record) ||
        recordMatchesPackCode(currentSpliceRecord, packCode)
      ) {
        currentSpliceRecord = record
        return
      }

      if (!currentLoadedRecord) {
        currentLoadedRecord = record
        lastMainOperation = MaterialOperationTypeEnum.FEED
        return
      }

      currentSpliceRecord = record
      return
    }

    if (operationType !== MaterialOperationTypeEnum.UNFEED) return

    if (recordMatchesTarget(currentSpliceRecord, packCode, materialIdno)) {
      currentSpliceRecord = null
      return
    }

    if (!recordMatchesTarget(currentLoadedRecord, packCode, materialIdno)) return

    if (currentSpliceRecord) {
      currentLoadedRecord = currentSpliceRecord
      currentSpliceRecord = null
      lastMainOperation = MaterialOperationTypeEnum.FEED
      return
    }

    currentLoadedRecord = null
    lastMainOperation = MaterialOperationTypeEnum.UNFEED
  })

  const latestActiveRecord =
    isRecordLater(currentSpliceRecord, currentLoadedRecord) ? currentSpliceRecord : currentLoadedRecord

  return {
    firstLoadedRecord,
    firstLoadedPackCode: normalizeValue(firstLoadedRecord?.material_pack_code) || null,
    currentLoadedRecord,
    currentLoadedPackCode: normalizeValue(currentLoadedRecord?.material_pack_code) || null,
    currentSpliceRecord,
    currentSplicePackCode: normalizeValue(currentSpliceRecord?.material_pack_code) || null,
    latestActiveRecord,
    latestActiveCorrect: normalizeCheckPackCodeMatch(normalizeValue(latestActiveRecord?.check_pack_code_match) || null),
    lastMainOperation,
  }
}

export function getLatestOperatorId<T extends FeedRecordBase>(records: T[]): string | null {
  const sorted = toSortedRecords(records)
  for (let i = sorted.length - 1; i >= 0; i--) {
    const record = sorted[i]
    const opType = record.operation_type ?? MaterialOperationTypeEnum.FEED
    if (opType !== MaterialOperationTypeEnum.FEED) continue
    if (!isCorrectFeedType(record.feed_material_pack_type)) continue
    const operatorId = normalizeValue(record.operator_id)
    if (operatorId) return operatorId
  }
  return null
}

export function filterInspectionRecords<T extends FeedRecordBase>(records: T[]): T[] {
  return records.filter(
    (r) =>
      (r.operation_type ?? MaterialOperationTypeEnum.FEED) === MaterialOperationTypeEnum.FEED &&
      r.feed_material_pack_type === FeedMaterialTypeEnum.INSPECTION_MATERIAL_PACK
  )
}

export function getLatestInspectionRecord<T extends FeedRecordBase>(inspections: T[]): T | null {
  if (inspections.length === 0) return null
  return inspections.reduce((latest, r) =>
    getTimeValue(r.operation_time) >= getTimeValue(latest.operation_time) ? r : latest
  )
}
