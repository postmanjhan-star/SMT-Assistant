import { buildPanasonicFeedRecordPayload } from "@/domain/production/PostProductionFeedRecord"

describe("buildPanasonicFeedRecordPayload", () => {
  it("defaults operation_type to FEED when not provided", () => {
    const payload = buildPanasonicFeedRecordPayload({
      statId: 1,
      slotIdno: "10008",
      subSlotIdno: "L",
      materialPackCode: "PACK-001",
      feedMaterialPackType: "NEW_MATERIAL_PACK",
      checkPackCodeMatch: "MATCHED_MATERIAL_PACK",
      operationTime: "2024-01-01T00:00:00Z",
      operatorId: "op-1",
    })

    expect(payload.operation_type).toBe("FEED")
  })

  it("maps UNFEED payload fields correctly", () => {
    const payload = buildPanasonicFeedRecordPayload({
      statId: 1,
      slotIdno: "10008",
      subSlotIdno: "L",
      materialPackCode: "PACK-UNFEED",
      operationType: "UNFEED",
      feedMaterialPackType: null,
      unfeedMaterialPackType: "NORMAL_UNFEED",
      checkPackCodeMatch: null,
      operationTime: "2024-01-01T00:00:00Z",
      operatorId: "op-1",
    })

    expect(payload).toEqual(
      expect.objectContaining({
        operation_type: "UNFEED",
        feed_material_pack_type: null,
        unfeed_material_pack_type: "NORMAL_UNFEED",
      })
    )
  })
})
