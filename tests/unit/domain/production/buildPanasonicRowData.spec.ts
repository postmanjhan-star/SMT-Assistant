import {
    BoardSideEnum,
    CheckMaterialMatchEnum,
    FeedMaterialTypeEnum,
    MachineSideEnum,
    PanasonicItemStatFeedLogRead,
    PanasonicMounterItemFeedRecordRead,
    PanasonicMounterItemStatRead,
    ProduceTypeEnum,
} from "@/client"
import { buildProductionRowData } from "@/domain/production/buildPanasonicRowData"

const makeFeedRecord = (
    overrides: Partial<PanasonicMounterItemFeedRecordRead & { id?: number }> = {}
): PanasonicMounterItemFeedRecordRead & { id?: number } => ({
    operator_id: "op-1",
    operation_time: "2024-01-01T00:00:00Z",
    material_pack_code: "PK-1",
    feed_material_pack_type: FeedMaterialTypeEnum.IMPORTED_MATERIAL_PACK,
    check_pack_code_match: CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK,
    ...overrides,
})

const makeStat = (
    overrides: Partial<PanasonicMounterItemStatRead> = {}
): PanasonicMounterItemStatRead => ({
    id: 1,
    uuid: "stat-1",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: null,
    production_start: "2024-01-01T00:00:00Z",
    production_end: null,
    work_order_no: null,
    product_idno: "P-1",
    machine_idno: "M-1",
    machine_side: MachineSideEnum.FRONT,
    board_side: BoardSideEnum.TOP,
    slot_idno: "A",
    sub_slot_idno: "1",
    material_idno: "MAT-1",
    produce_mode: ProduceTypeEnum.NORMAL_PRODUCE_MODE,
    feed_records: [],
    ...overrides,
})

const makeLog = (
    overrides: Partial<PanasonicItemStatFeedLogRead> = {}
): PanasonicItemStatFeedLogRead => ({
    id: 10,
    created_at: "2024-01-01T00:00:00Z",
    feed_record_id: 1,
    operator_id: "op-1",
    operation_time: "2024-01-01T00:00:00Z",
    machine_idno: "M-1",
    machine_side: MachineSideEnum.FRONT,
    board_side: BoardSideEnum.TOP,
    material_idno: "MAT-1",
    material_pack_code: "PK-1",
    feed_material_pack_type: FeedMaterialTypeEnum.IMPORTED_MATERIAL_PACK,
    slot_idno: "A",
    sub_slot_idno: "1",
    stat_uuid: "stat-1",
    produce_mode: ProduceTypeEnum.NORMAL_PRODUCE_MODE,
    check_pack_code_match: CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK,
    ...overrides,
})

describe("buildProductionRowData", () => {
    it("prefers log records over stat feed records with same id", () => {
        const stat = makeStat({
            feed_records: [
                makeFeedRecord({
                    id: 1,
                    material_pack_code: "PK-OLD",
                    feed_material_pack_type:
                        FeedMaterialTypeEnum.IMPORTED_MATERIAL_PACK,
                    check_pack_code_match:
                        CheckMaterialMatchEnum.UNMATCHED_MATERIAL_PACK,
                }),
            ],
        })
        const logs = [
            makeLog({
                feed_record_id: 1,
                material_pack_code: "PK-NEW",
                check_pack_code_match:
                    CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK,
            }),
        ]

        const [row] = buildProductionRowData([stat], logs)

        expect(row.materialInventoryIdno).toBe("PK-NEW")
        expect(row.correct).toBe(CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK)
    })

    it("derives latest inspection info and remark", () => {
        const stat = makeStat({
            feed_records: [
                makeFeedRecord({
                    feed_material_pack_type:
                        FeedMaterialTypeEnum.INSPECTION_MATERIAL_PACK,
                    material_pack_code: "INSP-1",
                    operation_time: "2024-01-01T10:00:00Z",
                }),
                makeFeedRecord({
                    feed_material_pack_type:
                        FeedMaterialTypeEnum.INSPECTION_MATERIAL_PACK,
                    material_pack_code: "INSP-2",
                    operation_time: "2024-01-02T10:00:00Z",
                }),
            ],
        })

        const [row] = buildProductionRowData([stat], [])

        expect(row.inspectMaterialPackCode).toBe("INSP-2")
        expect(row.inspectTime).toBe("2024-01-02T10:00:00Z")
        expect(row.inspectCount).toBe(2)
        expect(row.remark).toBe("巡檢 2 次")
    })

    it("sets correct only from imported records", () => {
        const stat = makeStat({
            feed_records: [
                makeFeedRecord({
                    feed_material_pack_type:
                        FeedMaterialTypeEnum.NEW_MATERIAL_PACK,
                    material_pack_code: "APP-1",
                    check_pack_code_match:
                        CheckMaterialMatchEnum.UNMATCHED_MATERIAL_PACK,
                }),
            ],
        })

        const [row] = buildProductionRowData([stat], [])

        expect(row.correct).toBeNull()
        expect(row.materialInventoryIdno).toBeNull()
    })

    it("builds appendedMaterialInventoryIdno from NEW/REUSED codes", () => {
        const stat = makeStat({
            feed_records: [
                makeFeedRecord({
                    feed_material_pack_type:
                        FeedMaterialTypeEnum.NEW_MATERIAL_PACK,
                    material_pack_code: "APP-1",
                }),
                makeFeedRecord({
                    feed_material_pack_type:
                        FeedMaterialTypeEnum.REUSED_MATERIAL_PACK,
                    material_pack_code: "APP-2",
                }),
                makeFeedRecord({
                    feed_material_pack_type:
                        FeedMaterialTypeEnum.NEW_MATERIAL_PACK,
                    material_pack_code: "APP-1",
                }),
                makeFeedRecord({
                    feed_material_pack_type:
                        FeedMaterialTypeEnum.REUSED_MATERIAL_PACK,
                    material_pack_code: " ",
                }),
                makeFeedRecord({
                    feed_material_pack_type:
                        FeedMaterialTypeEnum.NEW_MATERIAL_PACK,
                    material_pack_code: null,
                }),
            ],
        })

        const [row] = buildProductionRowData([stat], [])

        expect(row.appendedMaterialInventoryIdno).toBe("APP-1, APP-2")
    })

    it("removes appended code when UNFEED record appears later", () => {
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

        const [row] = buildProductionRowData([stat], [])
        expect(row.appendedMaterialInventoryIdno).toBe("APP-2")
    })

    it("treats missing operation_type as FEED for backward compatibility", () => {
        const stat = makeStat({
            feed_records: [
                makeFeedRecord({
                    id: 20,
                    operation_time: "2024-01-01T00:00:00Z",
                    material_pack_code: "APP-LEGACY",
                    feed_material_pack_type: FeedMaterialTypeEnum.NEW_MATERIAL_PACK,
                    operation_type: undefined as any,
                }),
            ],
        })

        const [row] = buildProductionRowData([stat], [])
        expect(row.appendedMaterialInventoryIdno).toBe("APP-LEGACY")
    })

    it("uses imported operation time as firstAppendTime when present", () => {
        const stat = makeStat({
            feed_records: [
                makeFeedRecord({
                    feed_material_pack_type:
                        FeedMaterialTypeEnum.NEW_MATERIAL_PACK,
                    operation_time: "2024-01-01T00:00:00Z",
                }),
                makeFeedRecord({
                    feed_material_pack_type:
                        FeedMaterialTypeEnum.IMPORTED_MATERIAL_PACK,
                    operation_time: "2024-01-02T00:00:00Z",
                    material_pack_code: "IMP-1",
                }),
            ],
        })

        const [row] = buildProductionRowData([stat], [])

        expect(row.firstAppendTime).toBe("2024-01-02T00:00:00Z")
    })

    it("falls back to first record time when no imported record", () => {
        const stat = makeStat({
            feed_records: [
                makeFeedRecord({
                    feed_material_pack_type:
                        FeedMaterialTypeEnum.NEW_MATERIAL_PACK,
                    operation_time: "2024-01-01T00:00:00Z",
                }),
                makeFeedRecord({
                    feed_material_pack_type:
                        FeedMaterialTypeEnum.REUSED_MATERIAL_PACK,
                    operation_time: "2024-01-02T00:00:00Z",
                }),
            ],
        })

        const [row] = buildProductionRowData([stat], [])

        expect(row.firstAppendTime).toBe("2024-01-01T00:00:00Z")
    })

    it("returns null firstAppendTime when no records", () => {
        const stat = makeStat({
            feed_records: [],
        })

        const [row] = buildProductionRowData([stat], [])

        expect(row.firstAppendTime).toBeNull()
    })
})
