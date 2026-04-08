import {
    BoardSideEnum,
    CheckMaterialMatchEnum,
    FeedMaterialTypeEnum,
    MaterialOperationTypeEnum,
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

    it("uses latest active feed after unfeeding imported", () => {
        const stat = makeStat({
            feed_records: [
                makeFeedRecord({
                    id: 1,
                    operation_time: "2024-01-01T00:00:00Z",
                    material_pack_code: "IMP-1",
                    feed_material_pack_type:
                        FeedMaterialTypeEnum.IMPORTED_MATERIAL_PACK,
                    check_pack_code_match:
                        CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK,
                    operation_type: MaterialOperationTypeEnum.FEED,
                }),
                makeFeedRecord({
                    id: 2,
                    operation_time: "2024-01-01T00:00:01Z",
                    material_pack_code: "IMP-1",
                    feed_material_pack_type:
                        FeedMaterialTypeEnum.IMPORTED_MATERIAL_PACK,
                    operation_type: MaterialOperationTypeEnum.UNFEED,
                }),
                makeFeedRecord({
                    id: 3,
                    operation_time: "2024-01-01T00:00:02Z",
                    material_pack_code: "NEW-1",
                    feed_material_pack_type: FeedMaterialTypeEnum.NEW_MATERIAL_PACK,
                    check_pack_code_match:
                        CheckMaterialMatchEnum.UNMATCHED_MATERIAL_PACK,
                    operation_type: MaterialOperationTypeEnum.FEED,
                }),
            ],
        })

        const [row] = buildProductionRowData([stat], [])

        expect(row.correct).toBe(CheckMaterialMatchEnum.UNMATCHED_MATERIAL_PACK)
        expect(row.materialInventoryIdno).toBe("IMP-1")
    })

    it("returns UNLOADED_MATERIAL_PACK when last status is UNFEED", () => {
        const stat = makeStat({
            feed_records: [
                makeFeedRecord({
                    id: 1,
                    operation_time: "2024-01-01T00:00:00Z",
                    material_pack_code: "IMP-1",
                    feed_material_pack_type:
                        FeedMaterialTypeEnum.IMPORTED_MATERIAL_PACK,
                    operation_type: MaterialOperationTypeEnum.FEED,
                }),
                makeFeedRecord({
                    id: 2,
                    operation_time: "2024-01-01T00:00:01Z",
                    material_pack_code: "IMP-1",
                    feed_material_pack_type:
                        FeedMaterialTypeEnum.IMPORTED_MATERIAL_PACK,
                    operation_type: MaterialOperationTypeEnum.UNFEED,
                }),
            ],
        })

        const [row] = buildProductionRowData([stat], [])

        expect(row.correct).toBe("UNLOADED_MATERIAL_PACK")
    })

    it("uses latest active feed even when imported remains active", () => {
        const stat = makeStat({
            feed_records: [
                makeFeedRecord({
                    id: 1,
                    operation_time: "2024-01-01T00:00:00Z",
                    material_pack_code: "IMP-1",
                    feed_material_pack_type:
                        FeedMaterialTypeEnum.IMPORTED_MATERIAL_PACK,
                    check_pack_code_match:
                        CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK,
                    operation_type: MaterialOperationTypeEnum.FEED,
                }),
                makeFeedRecord({
                    id: 2,
                    operation_time: "2024-01-01T00:00:01Z",
                    material_pack_code: "APP-1",
                    feed_material_pack_type: FeedMaterialTypeEnum.NEW_MATERIAL_PACK,
                    check_pack_code_match:
                        CheckMaterialMatchEnum.UNMATCHED_MATERIAL_PACK,
                    operation_type: MaterialOperationTypeEnum.FEED,
                }),
            ],
        })

        const [row] = buildProductionRowData([stat], [])

        expect(row.correct).toBe(CheckMaterialMatchEnum.UNMATCHED_MATERIAL_PACK)
        expect(row.materialInventoryIdno).toBe("IMP-1")
    })

    it("falls back to older active feed after latest appended UNFEED", () => {
        const stat = makeStat({
            feed_records: [
                makeFeedRecord({
                    id: 1,
                    operation_time: "2024-01-01T00:00:00Z",
                    material_pack_code: "IMP-1",
                    feed_material_pack_type:
                        FeedMaterialTypeEnum.IMPORTED_MATERIAL_PACK,
                    check_pack_code_match:
                        CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK,
                    operation_type: MaterialOperationTypeEnum.FEED,
                }),
                makeFeedRecord({
                    id: 2,
                    operation_time: "2024-01-01T00:00:01Z",
                    material_pack_code: "APP-1",
                    feed_material_pack_type: FeedMaterialTypeEnum.REUSED_MATERIAL_PACK,
                    check_pack_code_match:
                        CheckMaterialMatchEnum.UNMATCHED_MATERIAL_PACK,
                    operation_type: MaterialOperationTypeEnum.FEED,
                }),
                makeFeedRecord({
                    id: 3,
                    operation_time: "2024-01-01T00:00:02Z",
                    material_pack_code: "APP-1",
                    feed_material_pack_type: FeedMaterialTypeEnum.REUSED_MATERIAL_PACK,
                    operation_type: MaterialOperationTypeEnum.UNFEED,
                }),
            ],
        })

        const [row] = buildProductionRowData([stat], [])

        expect(row.correct).toBe(CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK)
    })

    it("includes IMPORTED pack in appendedMaterialInventoryIdno on initial load", () => {
        const stat = makeStat({
            feed_records: [
                makeFeedRecord({
                    feed_material_pack_type: FeedMaterialTypeEnum.IMPORTED_MATERIAL_PACK,
                    material_pack_code: "IMP-1",
                    check_pack_code_match: CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK,
                    operation_type: MaterialOperationTypeEnum.FEED,
                }),
            ],
        })

        const [row] = buildProductionRowData([stat], [])

        expect(row.appendedMaterialInventoryIdno).toBe("IMP-1")
    })

    it("removes IMPORTED pack from appendedMaterialInventoryIdno when UNFEED matches", () => {
        const stat = makeStat({
            feed_records: [
                makeFeedRecord({
                    id: 1,
                    operation_time: "2024-01-01T00:00:00Z",
                    material_pack_code: "IMP-1",
                    feed_material_pack_type: FeedMaterialTypeEnum.IMPORTED_MATERIAL_PACK,
                    operation_type: MaterialOperationTypeEnum.FEED,
                }),
                makeFeedRecord({
                    id: 2,
                    operation_time: "2024-01-01T00:01:00Z",
                    material_pack_code: "IMP-1",
                    feed_material_pack_type: FeedMaterialTypeEnum.IMPORTED_MATERIAL_PACK,
                    operation_type: MaterialOperationTypeEnum.UNFEED,
                }),
            ],
        })

        const [row] = buildProductionRowData([stat], [])

        expect(row.appendedMaterialInventoryIdno).toBe("")
    })

    it("splits current loaded and current splice pack codes", () => {
        const stat = makeStat({
            feed_records: [
                makeFeedRecord({
                    id: 1,
                    feed_material_pack_type:
                        FeedMaterialTypeEnum.NEW_MATERIAL_PACK,
                    material_pack_code: "APP-1",
                }),
                makeFeedRecord({
                    id: 2,
                    feed_material_pack_type:
                        FeedMaterialTypeEnum.REUSED_MATERIAL_PACK,
                    material_pack_code: "APP-2",
                }),
                makeFeedRecord({
                    id: 3,
                    feed_material_pack_type:
                        FeedMaterialTypeEnum.NEW_MATERIAL_PACK,
                    material_pack_code: "APP-1",
                }),
                makeFeedRecord({
                    id: 4,
                    feed_material_pack_type:
                        FeedMaterialTypeEnum.REUSED_MATERIAL_PACK,
                    material_pack_code: " ",
                }),
                makeFeedRecord({
                    id: 5,
                    feed_material_pack_type:
                        FeedMaterialTypeEnum.NEW_MATERIAL_PACK,
                    material_pack_code: null,
                }),
            ],
        })

        const [row] = buildProductionRowData([stat], [])

        expect(row.appendedMaterialInventoryIdno).toBe("APP-1")
        expect(row.spliceMaterialInventoryIdno).toBe("APP-2")
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
        expect(row.spliceMaterialInventoryIdno).toBeNull()
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

    it("uses current loaded pack time as operationTime", () => {
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

        expect(row.operationTime).toBe("2024-01-01T00:00:00Z")
    })

    it("keeps main pack time when a later splice record exists", () => {
        const stat = makeStat({
            feed_records: [
                makeFeedRecord({
                    material_pack_code: "PK-1",
                    feed_material_pack_type:
                        FeedMaterialTypeEnum.NEW_MATERIAL_PACK,
                    operation_time: "2024-01-01T00:00:00Z",
                }),
                makeFeedRecord({
                    material_pack_code: "PK-2",
                    feed_material_pack_type:
                        FeedMaterialTypeEnum.REUSED_MATERIAL_PACK,
                    operation_time: "2024-01-02T00:00:00Z",
                }),
            ],
        })

        const [row] = buildProductionRowData([stat], [])

        expect(row.operationTime).toBe("2024-01-01T00:00:00Z")
    })

    it("promotes splice pack to current loaded after main pack unfeed", () => {
        const stat = makeStat({
            feed_records: [
                makeFeedRecord({
                    id: 1,
                    operation_time: "2024-01-01T00:00:00Z",
                    material_pack_code: "IMP-1",
                    feed_material_pack_type: FeedMaterialTypeEnum.IMPORTED_MATERIAL_PACK,
                    operation_type: MaterialOperationTypeEnum.FEED,
                }),
                makeFeedRecord({
                    id: 2,
                    operation_time: "2024-01-01T00:00:01Z",
                    material_pack_code: "SPL-1",
                    feed_material_pack_type: FeedMaterialTypeEnum.REUSED_MATERIAL_PACK,
                    operation_type: MaterialOperationTypeEnum.FEED,
                    check_pack_code_match: CheckMaterialMatchEnum.UNMATCHED_MATERIAL_PACK,
                }),
                makeFeedRecord({
                    id: 3,
                    operation_time: "2024-01-01T00:00:02Z",
                    material_pack_code: "IMP-1",
                    feed_material_pack_type: null,
                    operation_type: MaterialOperationTypeEnum.UNFEED,
                }),
            ],
        })

        const [row] = buildProductionRowData([stat], [])

        expect(row.materialInventoryIdno).toBe("IMP-1")
        expect(row.appendedMaterialInventoryIdno).toBe("SPL-1")
        expect(row.spliceMaterialInventoryIdno).toBeNull()
        expect(row.correct).toBe(CheckMaterialMatchEnum.UNMATCHED_MATERIAL_PACK)
    })

    it("returns null operationTime when no records", () => {
        const stat = makeStat({
            feed_records: [],
        })

        const [row] = buildProductionRowData([stat], [])

        expect(row.operationTime).toBeNull()
    })
})
