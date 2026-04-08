import { PostProductionRecordUploader } from "@/application/post-production-feed/PostProductionRecordUploader"

const FIXED_TIME = "2024-06-01T00:00:00.000Z"

function makeApi() {
  return {
    uploadFeedRecord: vi.fn().mockResolvedValue({}),
    fetchMaterialInventory: vi.fn().mockResolvedValue({ id: "MAT-1" }),
  }
}

describe("PostProductionRecordUploader", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(FIXED_TIME))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe("uploadAppend", () => {
    it("送出完整 FEED payload（無 correctState / feedMaterialPackType）", async () => {
      const api = makeApi()
      const uploader = new PostProductionRecordUploader(api as any)

      await uploader.uploadAppend({
        statId: 1,
        slotIdno: "10008",
        subSlotIdno: "L",
        materialPackCode: "PACK-001",
        operatorId: "OP-99",
      })

      expect(api.uploadFeedRecord).toHaveBeenCalledTimes(1)
      expect(api.uploadFeedRecord.mock.calls[0][0]).toEqual({
        stat_item_id: 1,
        slot_idno: "10008",
        sub_slot_idno: "L",
        material_pack_code: "PACK-001",
        operation_type: "FEED",
        feed_material_pack_type: "NEW_MATERIAL_PACK",
        check_pack_code_match: "MATCHED_MATERIAL_PACK",
        unfeed_material_pack_type: null,
        unfeed_reason: null,
        operator_id: "OP-99",
        operation_time: FIXED_TIME,
      })
    })

    it("correctState 對應到 check_pack_code_match", async () => {
      const api = makeApi()
      const uploader = new PostProductionRecordUploader(api as any)

      await uploader.uploadAppend({
        statId: 2,
        slotIdno: "10008",
        subSlotIdno: null,
        materialPackCode: "PACK-002",
        correctState: "TESTING_MATERIAL_PACK",
      })

      const payload = api.uploadFeedRecord.mock.calls[0][0]
      expect(payload.check_pack_code_match).toBe("TESTING_MATERIAL_PACK")
      expect(payload.sub_slot_idno).toBeNull()
      expect(payload.operator_id).toBe("")
    })

    it("feedMaterialPackType 可自訂（e.g. 'INSPECTION_MATERIAL_PACK'）", async () => {
      const api = makeApi()
      const uploader = new PostProductionRecordUploader(api as any)

      await uploader.uploadAppend({
        statId: 3,
        slotIdno: "10008",
        subSlotIdno: "L",
        materialPackCode: "PACK-003",
        feedMaterialPackType: "INSPECTION_MATERIAL_PACK" as any,
        correctState: "MATCHED_MATERIAL_PACK",
      })

      const payload = api.uploadFeedRecord.mock.calls[0][0]
      expect(payload.feed_material_pack_type).toBe("INSPECTION_MATERIAL_PACK")
      expect(payload.check_pack_code_match).toBe("MATCHED_MATERIAL_PACK")
    })
  })

  describe("uploadUnfeed", () => {
    it("送出完整 UNFEED payload", async () => {
      const api = makeApi()
      const uploader = new PostProductionRecordUploader(api as any)

      await uploader.uploadUnfeed({
        statId: 1,
        slotIdno: "10008",
        subSlotIdno: "L",
        materialPackCode: "PACK-OUT",
        unfeedReason: "MATERIAL_CHANGE",
        operatorId: "OP-99",
      })

      expect(api.uploadFeedRecord).toHaveBeenCalledTimes(1)
      expect(api.uploadFeedRecord.mock.calls[0][0]).toEqual({
        stat_item_id: 1,
        slot_idno: "10008",
        sub_slot_idno: "L",
        material_pack_code: "PACK-OUT",
        operation_type: "UNFEED",
        feed_material_pack_type: null,
        unfeed_material_pack_type: "NORMAL_UNFEED",
        unfeed_reason: "MATERIAL_CHANGE",
        check_pack_code_match: "MATCHED_MATERIAL_PACK",
        operator_id: "OP-99",
        operation_time: FIXED_TIME,
      })
    })

    it("unfeedReason 未傳時為 null", async () => {
      const api = makeApi()
      const uploader = new PostProductionRecordUploader(api as any)

      await uploader.uploadUnfeed({
        statId: 1,
        slotIdno: "10008",
        subSlotIdno: "L",
        materialPackCode: "PACK-OUT",
      })

      const payload = api.uploadFeedRecord.mock.calls[0][0]
      expect(payload.unfeed_reason).toBeNull()
    })
  })

  describe("uploadInspection", () => {
    it("送出 FEED + inspect payload", async () => {
      const api = makeApi()
      const uploader = new PostProductionRecordUploader(api as any)

      await uploader.uploadInspection({
        statId: 1,
        slotIdno: "10008",
        subSlotIdno: "L",
        materialPackCode: "PACK-INSPECT",
        operatorId: "OP-99",
      })

      expect(api.uploadFeedRecord).toHaveBeenCalledTimes(1)
      expect(api.uploadFeedRecord.mock.calls[0][0]).toEqual({
        stat_item_id: 1,
        slot_idno: "10008",
        sub_slot_idno: "L",
        material_pack_code: "PACK-INSPECT",
        operation_type: "FEED",
        feed_material_pack_type: "INSPECTION_MATERIAL_PACK",
        check_pack_code_match: "MATCHED_MATERIAL_PACK",
        unfeed_material_pack_type: null,
        unfeed_reason: null,
        operator_id: "OP-99",
        operation_time: FIXED_TIME,
      })
    })
  })

  describe("fetchMaterialInventory", () => {
    it("委託給 api.fetchMaterialInventory 並回傳結果", async () => {
      const api = makeApi()
      const uploader = new PostProductionRecordUploader(api as any)

      const result = await uploader.fetchMaterialInventory("MAT-123")

      expect(api.fetchMaterialInventory).toHaveBeenCalledWith("MAT-123")
      expect(result).toEqual({ id: "MAT-1" })
    })
  })
})
