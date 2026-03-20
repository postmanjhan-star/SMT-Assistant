import { FujiPostProductionRecordUploader } from "@/application/post-production-feed/FujiPostProductionRecordUploader"

const FIXED_TIME = "2024-06-01T00:00:00.000Z"

function makeApi() {
  return {
    uploadFeedRecord: vi.fn().mockResolvedValue({}),
    fetchMaterialInventory: vi.fn().mockResolvedValue({ id: "MAT-1" }),
  }
}

describe("FujiPostProductionRecordUploader", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(FIXED_TIME))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe("uploadAppend", () => {
    it("送出完整 FEED payload，固定 feedMaterialPackType=new / check_pack_code_match=true", async () => {
      const api = makeApi()
      const uploader = new FujiPostProductionRecordUploader(api as any)

      await uploader.uploadAppend({
        statId: 1,
        slotIdno: "25",
        subSlotIdno: "A",
        materialPackCode: "PACK-001",
        operatorId: "OP-99",
      })

      expect(api.uploadFeedRecord).toHaveBeenCalledTimes(1)
      expect(api.uploadFeedRecord.mock.calls[0][0]).toEqual({
        stat_item_id: 1,
        slot_idno: "25",
        sub_slot_idno: "A",
        material_pack_code: "PACK-001",
        operation_type: "FEED",
        feed_material_pack_type: "new",
        check_pack_code_match: "true",
        unfeed_material_pack_type: null,
        unfeed_reason: null,
        operator_id: "OP-99",
        operation_time: FIXED_TIME,
      })
    })

    it("subSlotIdno 未傳時為 null", async () => {
      const api = makeApi()
      const uploader = new FujiPostProductionRecordUploader(api as any)

      await uploader.uploadAppend({
        statId: 1,
        slotIdno: "25",
        materialPackCode: "PACK-002",
      })

      const payload = api.uploadFeedRecord.mock.calls[0][0]
      expect(payload.sub_slot_idno).toBeNull()
      expect(payload.operator_id).toBe("")
    })
  })

  describe("uploadUnfeed", () => {
    it("送出完整 UNFEED payload", async () => {
      const api = makeApi()
      const uploader = new FujiPostProductionRecordUploader(api as any)

      await uploader.uploadUnfeed({
        statId: 1,
        slotIdno: "25",
        subSlotIdno: "A",
        materialPackCode: "PACK-OUT",
        unfeedReason: "MATERIAL_CHANGE",
        operatorId: "OP-99",
      })

      expect(api.uploadFeedRecord).toHaveBeenCalledTimes(1)
      expect(api.uploadFeedRecord.mock.calls[0][0]).toEqual({
        stat_item_id: 1,
        slot_idno: "25",
        sub_slot_idno: "A",
        material_pack_code: "PACK-OUT",
        operation_type: "UNFEED",
        feed_material_pack_type: null,
        unfeed_material_pack_type: "NORMAL_UNFEED",
        unfeed_reason: "MATERIAL_CHANGE",
        check_pack_code_match: "true",
        operator_id: "OP-99",
        operation_time: FIXED_TIME,
      })
    })

    it("unfeedReason 未傳時為 null", async () => {
      const api = makeApi()
      const uploader = new FujiPostProductionRecordUploader(api as any)

      await uploader.uploadUnfeed({
        statId: 1,
        slotIdno: "25",
        subSlotIdno: "A",
        materialPackCode: "PACK-OUT",
      })

      const payload = api.uploadFeedRecord.mock.calls[0][0]
      expect(payload.unfeed_reason).toBeNull()
    })
  })

  describe("fetchMaterialInventory", () => {
    it("委託給 api.fetchMaterialInventory 並回傳結果", async () => {
      const api = makeApi()
      const uploader = new FujiPostProductionRecordUploader(api as any)

      const result = await uploader.fetchMaterialInventory("MAT-456")

      expect(api.fetchMaterialInventory).toHaveBeenCalledWith("MAT-456")
      expect(result).toEqual({ id: "MAT-1" })
    })
  })
})
