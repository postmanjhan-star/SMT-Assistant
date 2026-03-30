import {
  BoardSideEnum,
  CheckMaterialMatchEnum,
  FeedMaterialTypeEnum,
  MaterialOperationTypeEnum,
  MachineSideEnum,
  ProduceTypeEnum,
  type FujiItemStatFeedLogRead,
  type FujiMounterItemStatRead,
} from "@/client"
import {
  buildFujiInspectionStats,
  buildFujiProductionRowData,
  isFujiStatSlotMatch,
  parseFujiProductionSlotIdno,
  type FujiFeedRecordLike,
} from "@/domain/production/buildFujiProductionRowData"

type FujiStatWithFeeds = FujiMounterItemStatRead & {
  feed_records?: FujiFeedRecordLike[]
  check_pack_code_match?: CheckMaterialMatchEnum | null
}

const makeFeedRecord = (
  overrides: Partial<FujiFeedRecordLike> = {}
): FujiFeedRecordLike => ({
  id: 1,
  operation_time: "2024-01-01T00:00:00Z",
  material_pack_code: "PK-1",
  feed_material_pack_type: FeedMaterialTypeEnum.IMPORTED_MATERIAL_PACK,
  check_pack_code_match: CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK,
  ...overrides,
})

const makeStat = (overrides: Partial<FujiStatWithFeeds> = {}): FujiStatWithFeeds => ({
  id: 1,
  uuid: "stat-1",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: null,
  production_start: "2024-01-01T00:00:00Z",
  production_end: null,
  work_order_no: "WO-1",
  product_idno: "PROD-1",
  machine_idno: "XP2B1",
  machine_side: MachineSideEnum.FRONT,
  board_side: BoardSideEnum.TOP,
  slot_idno: "25",
  sub_slot_idno: "1",
  material_idno: "MAT-1",
  produce_mode: ProduceTypeEnum.NORMAL_PRODUCE_MODE,
  feed_records: [],
  ...overrides,
})

const makeLog = (overrides: Partial<FujiItemStatFeedLogRead> = {}): FujiItemStatFeedLogRead => ({
  id: 10,
  created_at: "2024-01-01T00:00:00Z",
  feed_record_id: 1,
  operator_id: "OP-1",
  operation_time: "2024-01-01T00:00:00Z",
  machine_idno: "XP2B1",
  machine_side: MachineSideEnum.FRONT,
  board_side: BoardSideEnum.TOP,
  material_idno: "MAT-1",
  material_pack_code: "PK-1",
  feed_material_pack_type: FeedMaterialTypeEnum.IMPORTED_MATERIAL_PACK,
  slot_idno: "25",
  sub_slot_idno: "1",
  stat_uuid: "stat-1",
  produce_mode: ProduceTypeEnum.NORMAL_PRODUCE_MODE,
  check_pack_code_match: CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK,
  ...overrides,
})

describe("buildFujiProductionRowData", () => {
  it("prefers log records over stat feed records with same id", () => {
    const stat = makeStat({
      feed_records: [
        makeFeedRecord({
          id: 1,
          material_pack_code: "PK-OLD",
          check_pack_code_match: CheckMaterialMatchEnum.UNMATCHED_MATERIAL_PACK,
        }),
      ],
    })

    const logs = [
      makeLog({
        feed_record_id: 1,
        material_pack_code: "PK-NEW",
        check_pack_code_match: CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK,
      }),
    ]

    const [row] = buildFujiProductionRowData([stat], logs)

    expect(row.materialInventoryIdno).toBe("PK-NEW")
    expect(row.correct).toBe(CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK)
  })

  it("builds latest inspection info and inspection remark", () => {
    const stat = makeStat({
      feed_records: [
        makeFeedRecord({
          feed_material_pack_type: FeedMaterialTypeEnum.INSPECTION_MATERIAL_PACK,
          material_pack_code: "INSP-1",
          operation_time: "2024-01-01T10:00:00Z",
        }),
        makeFeedRecord({
          feed_material_pack_type: FeedMaterialTypeEnum.INSPECTION_MATERIAL_PACK,
          material_pack_code: "INSP-2",
          operation_time: "2024-01-02T10:00:00Z",
        }),
      ],
    })

    const [row] = buildFujiProductionRowData([stat], [])

    expect(row.inspectMaterialPackCode).toBe("INSP-2")
    expect(row.inspectTime).toBe("2024-01-02T10:00:00Z")
    expect(row.inspectCount).toBe(2)
    expect(row.remark).toBe("巡檢 2 次")
    expect(row.stage).toBe("A")
  })

  it("keeps testing remark when testing mode and testing match", () => {
    const stat = makeStat({
      produce_mode: ProduceTypeEnum.TESTING_PRODUCE_MODE,
      feed_records: [
        makeFeedRecord({
          feed_material_pack_type: FeedMaterialTypeEnum.IMPORTED_MATERIAL_PACK,
          check_pack_code_match: CheckMaterialMatchEnum.TESTING_MATERIAL_PACK,
        }),
      ],
    })

    const [row] = buildFujiProductionRowData([stat], [])

    expect(row.correct).toBe(CheckMaterialMatchEnum.TESTING_MATERIAL_PACK)
    expect(row.remark).toBe("[廠商測試新料]")
  })

  it("builds appended codes from non-imported records and de-duplicates", () => {
    const stat = makeStat({
      feed_records: [
        makeFeedRecord({
          feed_material_pack_type: FeedMaterialTypeEnum.NEW_MATERIAL_PACK,
          material_pack_code: "APP-1",
        }),
        makeFeedRecord({
          feed_material_pack_type: FeedMaterialTypeEnum.REUSED_MATERIAL_PACK,
          material_pack_code: "APP-2",
        }),
        makeFeedRecord({
          feed_material_pack_type: FeedMaterialTypeEnum.NEW_MATERIAL_PACK,
          material_pack_code: "APP-1",
        }),
        makeFeedRecord({
          feed_material_pack_type: FeedMaterialTypeEnum.IMPORTED_MATERIAL_PACK,
          material_pack_code: "IMP-1",
        }),
      ],
    })

    const [row] = buildFujiProductionRowData([stat], [])

    expect(row.appendedMaterialInventoryIdno).toBe("APP-1, APP-2")
  })

  it("removes appended code when UNFEED appears in later timeline", () => {
    const stat = makeStat({
      feed_records: [
        makeFeedRecord({
          id: 10,
          operation_time: "2024-01-01T00:00:00Z",
          material_pack_code: "APP-1",
          feed_material_pack_type: FeedMaterialTypeEnum.NEW_MATERIAL_PACK,
          operation_type: "FEED" as any,
        }),
        makeFeedRecord({
          id: 11,
          operation_time: "2024-01-01T00:00:01Z",
          material_pack_code: "APP-2",
          feed_material_pack_type: FeedMaterialTypeEnum.REUSED_MATERIAL_PACK,
          operation_type: "FEED" as any,
        }),
        makeFeedRecord({
          id: 12,
          operation_time: "2024-01-01T00:00:02Z",
          material_pack_code: "APP-1",
          feed_material_pack_type: null,
          operation_type: "UNFEED" as any,
        }),
      ],
    })

    const [row] = buildFujiProductionRowData([stat], [])
    expect(row.appendedMaterialInventoryIdno).toBe("APP-2")
  })

  it("keeps order stable with same operation_time by feed_record_id", () => {
    const stat = makeStat({
      feed_records: [
        makeFeedRecord({
          id: 20,
          operation_time: "2024-01-01T00:00:00Z",
          material_pack_code: "APP-1",
          feed_material_pack_type: FeedMaterialTypeEnum.NEW_MATERIAL_PACK,
          operation_type: "FEED" as any,
        }),
        makeFeedRecord({
          id: 22,
          operation_time: "2024-01-01T00:00:01Z",
          material_pack_code: "APP-1",
          feed_material_pack_type: null,
          operation_type: "UNFEED" as any,
        }),
        makeFeedRecord({
          id: 21,
          operation_time: "2024-01-01T00:00:01Z",
          material_pack_code: "APP-1",
          feed_material_pack_type: FeedMaterialTypeEnum.NEW_MATERIAL_PACK,
          operation_type: "FEED" as any,
        }),
      ],
    })

    const [row] = buildFujiProductionRowData([stat], [])
    expect(row.appendedMaterialInventoryIdno).toBe("")
  })

  it("clears main pack and marks unloaded when UNFEED matches pack code", () => {
    const stat = makeStat({
      feed_records: [
        makeFeedRecord({
          id: 1,
          operation_time: "2024-01-01T00:00:00Z",
          material_pack_code: "PK-1",
          feed_material_pack_type: FeedMaterialTypeEnum.IMPORTED_MATERIAL_PACK,
          check_pack_code_match: CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK,
        }),
        makeFeedRecord({
          id: 2,
          operation_time: "2024-01-01T00:01:00Z",
          material_pack_code: "PK-1",
          feed_material_pack_type: null,
          operation_type: MaterialOperationTypeEnum.UNFEED,
        }),
      ],
    })

    const [row] = buildFujiProductionRowData([stat], [])

    expect(row.materialInventoryIdno).toBe("PK-1")
    expect(row.correct).toBe("UNLOADED_MATERIAL_PACK")
  })

  it("keeps main pack when UNFEED does not match", () => {
    const stat = makeStat({
      feed_records: [
        makeFeedRecord({
          id: 1,
          operation_time: "2024-01-01T00:00:00Z",
          material_pack_code: "PK-1",
          feed_material_pack_type: FeedMaterialTypeEnum.IMPORTED_MATERIAL_PACK,
          check_pack_code_match: CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK,
        }),
        makeFeedRecord({
          id: 2,
          operation_time: "2024-01-01T00:01:00Z",
          material_pack_code: "PK-2",
          feed_material_pack_type: null,
          operation_type: MaterialOperationTypeEnum.UNFEED,
        }),
      ],
    })

    const [row] = buildFujiProductionRowData([stat], [])

    expect(row.materialInventoryIdno).toBe("PK-1")
    expect(row.correct).toBe(CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK)
  })

  it("restores main pack and correct after a later import", () => {
    const stat = makeStat({
      feed_records: [
        makeFeedRecord({
          id: 1,
          operation_time: "2024-01-01T00:00:00Z",
          material_pack_code: "PK-1",
          feed_material_pack_type: FeedMaterialTypeEnum.IMPORTED_MATERIAL_PACK,
          check_pack_code_match: CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK,
        }),
        makeFeedRecord({
          id: 2,
          operation_time: "2024-01-01T00:01:00Z",
          material_pack_code: "PK-1",
          feed_material_pack_type: null,
          operation_type: MaterialOperationTypeEnum.UNFEED,
        }),
        makeFeedRecord({
          id: 3,
          operation_time: "2024-01-01T00:02:00Z",
          material_pack_code: "PK-2",
          feed_material_pack_type: FeedMaterialTypeEnum.IMPORTED_MATERIAL_PACK,
          check_pack_code_match: CheckMaterialMatchEnum.UNMATCHED_MATERIAL_PACK,
        }),
      ],
    })

    const [row] = buildFujiProductionRowData([stat], [])

    expect(row.materialInventoryIdno).toBe("PK-2")
    expect(row.correct).toBe(CheckMaterialMatchEnum.UNMATCHED_MATERIAL_PACK)
  })
})

describe("buildFujiInspectionStats", () => {
  it("merges logs and stat feed records by normalized slot key", () => {
    const stat = makeStat({
      slot_idno: "25",
      sub_slot_idno: "1",
      feed_records: [
        makeFeedRecord({
          feed_material_pack_type: FeedMaterialTypeEnum.IMPORTED_MATERIAL_PACK,
          material_pack_code: "IMP-1",
        }),
      ],
    })
    const logs = [
      makeLog({
        slot_idno: "25",
        sub_slot_idno: "A",
        feed_material_pack_type: FeedMaterialTypeEnum.INSPECTION_MATERIAL_PACK,
        material_pack_code: "INSP-1",
      }),
    ]

    const result = buildFujiInspectionStats(logs, [stat])

    expect(result).toHaveLength(1)
    expect(result[0].slotIdno).toBe("25")
    expect(result[0].subSlotIdno).toBe("A")
    expect(result[0].feedRecords).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          feedMaterialPackType: FeedMaterialTypeEnum.INSPECTION_MATERIAL_PACK,
          materialPackCode: "INSP-1",
        }),
        expect.objectContaining({
          feedMaterialPackType: FeedMaterialTypeEnum.IMPORTED_MATERIAL_PACK,
          materialPackCode: "IMP-1",
        }),
      ])
    )
  })
})

describe("fuji slot helpers", () => {
  it("parseFujiProductionSlotIdno normalizes stage number", () => {
    const parsed = parseFujiProductionSlotIdno("XP2B1-1-25")
    expect(parsed).toEqual({
      mounterIdno: "XP2B1",
      stage: "A",
      slot: 25,
      slotIdno: "XP2B1-A-25",
    })
  })

  it("parseFujiProductionSlotIdno returns null for invalid input", () => {
    expect(parseFujiProductionSlotIdno("XP2B1-A")).toBeNull()
    expect(parseFujiProductionSlotIdno("XP2B1-A-0")).toBeNull()
    expect(parseFujiProductionSlotIdno("XP2B1-A-25-EXTRA")).toBeNull()
  })

  it("isFujiStatSlotMatch supports numeric and alpha stage", () => {
    const stat = makeStat({ slot_idno: "25", sub_slot_idno: "1" })
    expect(isFujiStatSlotMatch(stat, 25, "A")).toBe(true)
    expect(isFujiStatSlotMatch(stat, "25", "1")).toBe(true)
    expect(isFujiStatSlotMatch(stat, "25", "B")).toBe(false)
  })
})
