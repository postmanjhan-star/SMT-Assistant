import {
  CheckMaterialMatchEnum,
  FeedMaterialTypeEnum,
  ProduceTypeEnum,
  type FujiItemStatFeedLogRead,
  type FujiMounterItemStatRead,
} from "@/client"
import type { StatLike } from "@/domain/production/PostProductionFeedRules"

type FujiMounterItemStatReadWithFeeds = FujiMounterItemStatRead & {
  feed_records?: FujiFeedRecordLike[]
  check_pack_code_match?: CheckMaterialMatchEnum | null
}

export type FujiFeedRecordLike = {
  id?: number
  feed_record_id?: number
  slot_idno?: string
  sub_slot_idno?: string | null
  operation_time?: string
  material_pack_code?: string | null
  materialPackCode?: string | null
  material_pack_idno?: string | null
  materialPackIdno?: string | null
  feed_material_pack_type?: string | FeedMaterialTypeEnum | null
  feedMaterialPackType?: string | FeedMaterialTypeEnum | null
  feed_material_type?: string | FeedMaterialTypeEnum | null
  feedMaterialType?: string | FeedMaterialTypeEnum | null
  check_pack_code_match?: CheckMaterialMatchEnum | null
}

type FujiMounterProductionSlot = {
  mounterIdno: string
  stage: string
  slot: number
}

export type FujiProductionRowModel = {
  correct: CheckMaterialMatchEnum | null
  id: number
  mounterIdno: string
  boardSide: string
  stage: string
  slot: number
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

function getRecordType(record: FujiFeedRecordLike): string {
  return normalizeFeedMaterialType(
    record.feed_material_pack_type ??
      record.feedMaterialPackType ??
      record.feed_material_type ??
      record.feedMaterialType ??
      ""
  )
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

function getRecordTime(record: FujiFeedRecordLike): string {
  return String(record.operation_time ?? "")
}

function getRecordUniqueKey(record: FujiFeedRecordLike): string {
  const recordId = record.feed_record_id ?? record.id
  if (recordId != null) return `record_id:${recordId}`

  const slotIdno = String(record.slot_idno ?? "")
  const subSlotIdno = String(record.sub_slot_idno ?? "")
  const operationTime = getRecordTime(record)
  const materialPackCode = getRecordPackCode(record) ?? ""
  return `composite:${getRecordType(record)}-${normalizeSlotKey(
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

function getStatFeedRecords(stat: FujiMounterItemStatReadWithFeeds): FujiFeedRecordLike[] {
  return stat.feed_records ?? []
}

function statMatchesStage(statStage: unknown, inputStage: string | null): boolean {
  if (!inputStage) return false
  const rawStage = String(statStage ?? "")
  const normalized = normalizeStageLabel(statStage)
  return inputStage === rawStage || inputStage === normalized
}

export function parseFujiProductionSlotIdno(
  slotIdno: string
): (FujiMounterProductionSlot & { slotIdno: string }) | null {
  const parts = slotIdno.trim().split("-")
  if (parts.length < 3) return null

  const machineIdno = parts[0]
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
  logs: FujiItemStatFeedLogRead[],
  stats: FujiMounterItemStatRead[]
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
    const withFeeds = record as FujiMounterItemStatReadWithFeeds
    getStatFeedRecords(withFeeds).forEach((feedRecord) => {
      addRecord(record.slot_idno, record.sub_slot_idno, feedRecord)
    })
  })

  return Array.from(map.values())
}

export function buildFujiProductionRowData(
  stats: FujiMounterItemStatRead[],
  logs: FujiItemStatFeedLogRead[]
): FujiProductionRowModel[] {
  return stats.map((statRecord) => {
    const stat = statRecord as FujiMounterItemStatReadWithFeeds
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
    }))

    const inspectionRecords = normalizedFeedRecords.filter(
      (record) =>
        record.feed_material_pack_type === FeedMaterialTypeEnum.INSPECTION_MATERIAL_PACK
    )

    const inspectCount = inspectionRecords.length
    const latestInspection =
      inspectionRecords.sort(
        (a, b) => new Date(getRecordTime(b)).getTime() - new Date(getRecordTime(a)).getTime()
      )[0] ?? null

    const materialRecords = normalizedFeedRecords
      .filter(
        (record) =>
          record.feed_material_pack_type !== FeedMaterialTypeEnum.INSPECTION_MATERIAL_PACK
      )
      .sort(
        (a, b) => new Date(getRecordTime(a)).getTime() - new Date(getRecordTime(b)).getTime()
      )

    const importMaterialPack = normalizedFeedRecords.find(
      (record) => record.feed_material_pack_type === FeedMaterialTypeEnum.IMPORTED_MATERIAL_PACK
    )

    const latestMaterialRecord =
      materialRecords.length > 0 ? materialRecords[materialRecords.length - 1] : null

    const appendedCodes = [
      ...new Set(
        normalizedFeedRecords
          .filter(
            (record) =>
              record.feed_material_pack_type !== FeedMaterialTypeEnum.IMPORTED_MATERIAL_PACK
          )
          .map((record) => record.material_pack_code)
          .filter((code): code is string => !!code)
      ),
    ].join(", ")

    const stage = normalizeStageLabel(stat.sub_slot_idno)
    const checkPackCodeMatch =
      (importMaterialPack?.check_pack_code_match ?? stat.check_pack_code_match ?? null) as
        | CheckMaterialMatchEnum
        | null

    let remark =
      stat.produce_mode === ProduceTypeEnum.TESTING_PRODUCE_MODE &&
      checkPackCodeMatch === CheckMaterialMatchEnum.TESTING_MATERIAL_PACK
        ? "[廠商測試新料]"
        : ""

    if (inspectCount > 0) {
      remark = `${remark} 巡檢 ${inspectCount} 次`.trim()
    }

    return {
      id: stat.id,
      correct: checkPackCodeMatch,
      inspectMaterialPackCode: latestInspection?.material_pack_code ?? "",
      inspectTime: latestInspection?.operation_time ?? null,
      inspectCount,
      mounterIdno: stat.machine_idno,
      boardSide: String(stat.board_side ?? ""),
      stage,
      slot: Number(stat.slot_idno),
      materialIdno: String(stat.material_idno ?? ""),
      materialInventoryIdno: latestMaterialRecord?.material_pack_code ?? "",
      operationTime: latestMaterialRecord?.operation_time ?? null,
      operatorIdno: null,
      appendedMaterialInventoryIdno: appendedCodes,
      remark,
    }
  })
}

export function isFujiStatSlotMatch(
  stat: Pick<FujiMounterItemStatRead, "slot_idno" | "sub_slot_idno">,
  slot: string | number,
  stage: string | null
): boolean {
  return (
    String(stat.slot_idno) === String(slot ?? "") && statMatchesStage(stat.sub_slot_idno, stage)
  )
}

