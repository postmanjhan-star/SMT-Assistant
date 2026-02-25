import { PostProductionRecordUploader } from "@/application/post-production-feed/PostProductionRecordUploader"

describe("PostProductionRecordUploader", () => {
  it("uploadAppend sends FEED operation_type", async () => {
    const api = {
      uploadFeedRecord: vi.fn().mockResolvedValue({}),
      fetchMaterialInventory: vi.fn(),
    }
    const uploader = new PostProductionRecordUploader(api as any)

    await uploader.uploadAppend({
      statId: 1,
      slotIdno: "10008",
      subSlotIdno: "L",
      materialPackCode: "PACK-APPEND",
    })

    expect(api.uploadFeedRecord).toHaveBeenCalledTimes(1)
    const payload = api.uploadFeedRecord.mock.calls[0][0]
    expect(payload).toEqual(
      expect.objectContaining({
        operation_type: "FEED",
      })
    )
  })

  it("uploadUnfeed sends UNFEED and NORMAL_UNFEED", async () => {
    const api = {
      uploadFeedRecord: vi.fn().mockResolvedValue({}),
      fetchMaterialInventory: vi.fn(),
    }
    const uploader = new PostProductionRecordUploader(api as any)

    await uploader.uploadUnfeed({
      statId: 1,
      slotIdno: "10008",
      subSlotIdno: "L",
      materialPackCode: "PACK-UNFEED",
    })

    expect(api.uploadFeedRecord).toHaveBeenCalledTimes(1)
    const payload = api.uploadFeedRecord.mock.calls[0][0]
    expect(payload).toEqual(
      expect.objectContaining({
        operation_type: "UNFEED",
        unfeed_material_pack_type: "NORMAL_UNFEED",
        feed_material_pack_type: null,
        check_pack_code_match: null,
      })
    )
  })
})
