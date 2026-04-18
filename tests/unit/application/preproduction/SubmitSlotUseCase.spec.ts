import { SubmitSlotUseCase } from "@/application/preproduction/SubmitSlotUseCase"

describe("SubmitSlotUseCase", () => {
  const payload = { slotIdno: "10008", slot: "1", subSlot: "L" }

  it("submit 成功時回傳 success + reset 值", async () => {
    const uc = new SubmitSlotUseCase({
      submitSlot: vi.fn().mockResolvedValue(true),
    })

    const result = await uc.execute(payload)

    expect(result.success).toBe(true)
    expect(result.reset).toEqual({
      slotForm: { slotIdno: "", materialInventoryIdno: "", remark: "" },
      materialForm: { materialInventoryIdno: "" },
    })
  })

  it("submit 失敗時回傳 success: false 且無 reset", async () => {
    const uc = new SubmitSlotUseCase({
      submitSlot: vi.fn().mockResolvedValue(false),
    })

    const result = await uc.execute(payload)

    expect(result.success).toBe(false)
    expect(result.reset).toBeUndefined()
  })
})
