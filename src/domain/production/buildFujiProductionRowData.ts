import {
  CheckMaterialMatchEnum,
  FeedMaterialTypeEnum,
  MaterialOperationTypeEnum,
  ProduceTypeEnum,
} from "@/domain/shared/domainEnums"
import type { FujiItemStatFeedLogInput, FujiMounterItemStatInput } from "@/domain/shared/inputTypes"
import type { StatLike } from "@/domain/production/PostProductionFeedRules"

export type FujiFeedRecordLike = {
  id?: number
  feed_record_id?: number
  slot_idno?: string
  sub_slot_idno?: string | null
  operation_time?: string
  material_idno?: string | null
  materialIdno?: string | null
  material_pack_code?: string | null
  materialPackCode?: string | null
  material_pack_idno?: string | null
  materialPackIdno?: string | null
  operation_type?: string | null
  operationType?: string | null
  feed_material_pack_type?: string | null
  feedMaterialPackType?: string | null
  feed_material_type?: string | null
  feedMaterialType?: string | null
  check_pack_code_match?: string | null
}

type FujiMounterProductionSlot = {
  mounterIdno: string
  stage: string
  slot: number
}

export type FujiProductionRowModel = {
  correct: string | null
  id: number
  mounterIdno: string
  boardSide: string
  stage: string
  slot: number
  slotIdno: string
  subSlotIdno: string
  materialIdno: string
  operatorIdno: string | null
  materialInventoryIdno: string | null
  remark?: string
  appendedMaterialInventoryIdno?: string
  operationTime?: string | null
  inspectTime?: string | null
  inspectMaterialPackCode?: string | null
  inspectCount?: number | null
}

function normalizeStageLabel(stage: unknown): string {
  if (stage == null) return ""
  const value = String(stage).trim()
  if (value === "1") return "A"
  if (value === "2") return "B"
  if (value === "3") return "C"
  if (value === "4") return "D"
  return value
}

function normalizeSlotKey(slotIdnoRaw: unknown, subSlotRaw: unknown): string {
  const slotIdno = String(slotIdnoRaw ?? "").trim()
  const subSlotIdno = normalizeStageLabel(subSlotRaw)
  return `${slotIdno}-${subSlotIdno}`
}

function normalizeFeedMaterialType(value: unknown): string {
  const raw = String(value ?? "").trim()
  if (!raw) return ""
  const upper = raw.toUpperCase()

  if (upper.includes("IMPORT")) return FeedMaterialTypeEnum.IMPORTED_MATERIAL_PACK
  if (upper.includes("INSPECT")) return FeedMaterialTypeEnum.INSPECTION_MATERIAL_PACK
  if (upper.includes("REUSE")) return FeedMaterialTypeEnum.REUSED_MATERIAL_PACK
  if (upper.includes("NEW")) return FeedMaterialTypeEnum.NEW_MATERIAL_PACK

  return upper
}

function normalizeOperationType(value: unknown): MaterialOperationTypeEnum {
  if (value == null) return MaterialOperationTypeEnum.FEED
  const upper = String(value).toUpperCase().trim()
  if (upper === MaterialOperationTypeEnum.UNFEED) {
    return MaterialOperationTypeEnum.UNFEED
  }

  return MaterialOperationTypeEnum.FEED
}

function getRecordType(record: FujiFeedRecordLike): string {
  return normalizeFeedMaterialType(
    record.feed_material_pack_type ??
      record.feedMaterialPackType ??
      record.feed_material_type ??
      record.feedMaterialType ??
      ""
  )
}

function getRecordOperationType(record: FujiFeedRecordLike): MaterialOperationTypeEnum {
  return normalizeOperationType(record.operation_type ?? record.operationType)
}

function getRecordPackCode(record: FujiFeedRecordLike): string | null {
  return (
    record.material_pack_code ??
    record.materialPackCode ??
    record.material_pack_idno ??
    record.materialPackIdno ??
    null
  )
}

function getRecordMaterialIdno(record: FujiFeedRecordLike): string | null {
  return record.material_idno ?? record.materialIdno ?? null
}

function getRecordTime(record: FujiFeedRecordLike): string {
  return String(record.operation_time ?? "")
}

function getRecordTimeNumber(record: FujiFeedRecordLike): number {
  const timeValue = getRecordTime(record)
  if (!timeValue) return 0
  const parsed = new Date(timeValue).getTime()
  return Number.isFinite(parsed) ? parsed : 0
}

function getRecordUniqueKey(record: FujiFeedRecordLike): string {
  const recordId = record.feed_record_id ?? record.id
  if (recordId != null) return `record_id:${recordId}`

  const slotIdno = String(record.slot_idno ?? "")
  const subSlotIdno = String(record.sub_slot_idno ?? "")
  const operationTime = getRecordTime(record)
  const materialPackCode = getRecordPackCode(record) ?? ""
  const operationType = getRecordOperationType(record)

  return `composite:${operationType}-${getRecordType(record)}-${normalizeSlotKey(
    slotIdno,
    subSlotIdno
  )}-${materialPackCode}-${operationTime}`
}

function mergeFeedRecords(
  baseRecords: FujiFeedRecordLike[],
  logRecords: FujiFeedRecordLike[]
): FujiFeedRecordLike[] {
  const recordMap = new Map<string, FujiFeedRecordLike>()
  baseRecords.forEach((record) => recordMap.set(getRecordUniqueKey(record), record))
  logRecords.forEach((record) => recordMap.set(getRecordUniqueKey(record), record))
  return Array.from(recordMap.values())
}

function getStatFeedRecords(stat: FujiMounterItemStatInput): FujiFeedRecordLike[] {
  return (stat.feed_records ?? []) as FujiFeedRecordLike[]
}

function statMatchesStage(statStage: unknown, inputStage: string | null): boolean {
  if (!inputStage) return false
  const rawStage = String(statStage ?? "")
  const normalized = normalizeStageLabel(statStage)
  return inputStage === rawStage || inputStage === normalized
}

function sortRecords(records: FujiFeedRecordLike[]): FujiFeedRecordLike[] {
  return records
    .map((record, index) => ({ ...record, __index: index }))
    .sort((a, b) => {
      const timeDiff = getRecordTimeNumber(a) - getRecordTimeNumber(b)
      if (timeDiff !== 0) return timeDiff

      const aId = a.feed_record_id ?? a.id ?? Number.MAX_SAFE_INTEGER
      const bId = b.feed_record_id ?? b.id ?? Number.MAX_SAFE_INTEGER
      if (aId !== bId) return aId - bId

      return a.__index - b.__index
    })
}

function buildAppendedCodes(records: FujiFeedRecordLike[]): string {
  const codeSet = new Set<string>()

  sortRecords(records).forEach((record) => {
    const operationType = getRecordOperationType(record)
    const code = String(getRecordPackCode(record) ?? "").trim()
    if (!code) return

    if (operationType === MaterialOperationTypeEnum.UNFEED) {
      codeSet.delete(code)
      return
    }

    const feedType = getRecordType(record)
    if (
      feedType === FeedMaterialTypeEnum.IMPORTED_MATERIAL_PACK ||
      feedType === FeedMaterialTypeEnum.NEW_MATERIAL_PACK ||
      feedType === FeedMaterialTypeEnum.REUSED_MATERIAL_PACK
    ) {
      codeSet.add(code)
    }
  })

  return Array.from(codeSet).join(", ")
}

function normalizeValue(value: unknown): string {
  return String(value ?? "").trim()
}

function resolveMainImportState(records: FujiFeedRecordLike[]): {
  activeImport: FujiFeedRecordLike | null
  lastKnownImport: FujiFeedRecordLike | null
  lastMainOperation: MaterialOperationTypeEnum | null
} {
  let activeImport: FujiFeedRecordLike | null = null
  let lastKnownImport: FujiFeedRecordLike | null = null
  let lastMainOperation: MaterialOperationTypeEnum | null = null

  sortRecords(records).forEach((record) => {
    const operationType = getRecordOperationType(record)
    const feedType = getRecordType(record)
    const packCode = normalizeValue(getRecordPackCode(record))
    const materialIdno = normalizeValue(getRecordMaterialIdno(record))

    if (
      operationType === MaterialOperationTypeEnum.FEED &&
      feedType === FeedMaterialTypeEnum.IMPORTED_MATERIAL_PACK
    ) {
      activeImport = record
      lastKnownImport = record
      lastMainOperation = MaterialOperationTypeEnum.FEED
      return
    }

    if (operationType === MaterialOperationTypeEnum.UNFEED && activeImport) {
      const activePackCode = normalizeValue(getRecordPackCode(activeImport))
      const activeMaterialIdno = normalizeValue(getRecordMaterialIdno(activeImport))
      const samePackCode = !!packCode && activePackCode === packCode
      const sameMaterialIdno = !!materialIdno && activeMaterialIdno === materialIdno

      if (samePackCode || sameMaterialIdno) {
        activeImport = null
        lastMainOperation = MaterialOperationTypeEnum.UNFEED
      }
    }
  })

  return { activeImport, lastKnownImport, lastMainOperation }
}

export function parseFujiProductionSlotIdno(
  slotIdno: string
): (FujiMounterProductionSlot & { slotIdno: string }) | null {
  const parts = slotIdno.trim().split("-")
  if (parts.length !== 3) return null

  const machineIdno = parts[0].trim()
  const stage = normalizeStageLabel(parts[1])
  const slot = Number(parts[2])

  if (!machineIdno || !stage || !slot) return null
  return {
    mounterIdno: machineIdno,
    stage,
    slot,
    slotIdno: `${machineIdno}-${stage}-${slot}`,
  }
}

export function buildFujiInspectionStats(
  logs: FujiItemStatFeedLogInput[],
  stats: FujiMounterItemStatInput[]
): StatLike[] {
  const map = new Map<string, StatLike>()

  const addRecord = (slotIdnoRaw: unknown, subSlotRaw: unknown, record: FujiFeedRecordLike) => {
    const slotIdno = String(slotIdnoRaw ?? "").trim()
    if (!slotIdno) return

    const subSlotIdno = normalizeStageLabel(subSlotRaw ?? "")
    const key = normalizeSlotKey(slotIdno, subSlotIdno)
    let stat = map.get(key)

    if (!stat) {
      stat = {
        slotIdno,
        subSlotIdno,
        feedRecords: [],
      }
      map.set(key, stat)
    }

    stat.feedRecords?.push({
      feedMaterialPackType: getRecordType(record),
      materialPackCode: getRecordPackCode(record),
    })
  }

  logs.forEach((record) => addRecord(record.slot_idno, record.sub_slot_idno, record))

  stats.forEach((record) => {
    getStatFeedRecords(record).forEach((feedRecord) => {
      addRecord(record.slot_idno, record.sub_slot_idno, feedRecord)
    })
  })

  return Array.from(map.values())
}

export function buildFujiProductionRowData(
  stats: FujiMounterItemStatInput[],
  logs: FujiItemStatFeedLogInput[]
): FujiProductionRowModel[] {
  return stats.map((stat) => {
    let feedRecords = getStatFeedRecords(stat)

    if (logs.length > 0) {
      const statSlotKey = normalizeSlotKey(stat.slot_idno, stat.sub_slot_idno)
      const matchingLogs = logs.filter(
        (log) => normalizeSlotKey(log.slot_idno, log.sub_slot_idno) === statSlotKey
      )

      if (matchingLogs.length > 0) {
        feedRecords = mergeFeedRecords(feedRecords, matchingLogs)
      }
    }

    const normalizedFeedRecords = feedRecords.map((record) => ({
      ...record,
      feed_material_pack_type: getRecordType(record),
      material_pack_code: getRecordPackCode(record),
      operation_type: getRecordOperationType(record),
    }))

    const inspectionRecords = normalizedFeedRecords.filter(
      (record) =>
        record.operation_type === MaterialOperationTypeEnum.FEED &&
        record.feed_material_pack_type === FeedMaterialTypeEnum.INSPECTION_MATERIAL_PACK
    )

    const inspectCount = inspectionRecords.length
    const latestInspection =
      inspectionRecords.sort(
        (a, b) => getRecordTimeNumber(b) - getRecordTimeNumber(a)
      )[0] ?? null

    const { activeImport: activeImportedRecord, lastKnownImport: lastKnownImportedRecord, lastMainOperation } =
      resolveMainImportState(normalizedFeedRecords)

    const appendedCodes = buildAppendedCodes(normalizedFeedRecords)

    const stage = normalizeStageLabel(stat.sub_slot_idno)
    const checkPackCodeMatch =
      (activeImportedRecord?.check_pack_code_match ?? null) as
        | CheckMaterialMatchEnum
        | null
    const correctValue =
      activeImportedRecord != null
        ? checkPackCodeMatch
        : lastMainOperation === MaterialOperationTypeEnum.UNFEED
          ? "UNLOADED_MATERIAL_PACK"
          : null

    const remarkParts: string[] = []
    if (
      stat.produce_mode === ProduceTypeEnum.TESTING_PRODUCE_MODE &&
      checkPackCodeMatch === CheckMaterialMatchEnum.TESTING_MATERIAL_PACK
    ) {
      remarkParts.push("[廠商測試新料]")
    }

    if (inspectCount > 0) {
      remarkParts.push(`巡檢 ${inspectCount} 次`)
    }

    return {
      id: stat.id,
      correct: correctValue,
      inspectMaterialPackCode: latestInspection?.material_pack_code ?? "",
      inspectTime: latestInspection?.operation_time ?? null,
      inspectCount,
      mounterIdno: stat.machine_idno,
      boardSide: String(stat.board_side ?? ""),
      stage,
      slot: Number(stat.slot_idno),
      slotIdno: String(stat.slot_idno),
      subSlotIdno: stage,
      materialIdno: String(stat.material_idno ?? ""),
      materialInventoryIdno: lastKnownImportedRecord?.material_pack_code ?? "",
      operationTime: activeImportedRecord?.operation_time ?? null,
      operatorIdno: null,
      appendedMaterialInventoryIdno: appendedCodes,
      remark: remarkParts.join(" ").trim(),
    }
  })
}

export function isFujiStatSlotMatch(
  stat: Pick<FujiMounterItemStatInput, "slot_idno" | "sub_slot_idno">,
  slot: string | number,
  stage: string | null
): boolean {
  return (
    String(stat.slot_idno) === String(slot ?? "") && statMatchesStage(stat.sub_slot_idno, stage)
  )
}
