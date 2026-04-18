import { SlotSubmissionRunner } from "@/application/slot-submit/SlotSubmissionRunner"

describe("SlotSubmissionRunner", () => {
  const payload = { slotIdno: "10008", slot: "1", subSlot: "L" }

  it("submit 成功時回傳 true 並呼叫 afterSuccess", async () => {
    const afterSuccess = vi.fn()
    const { handleSlotSubmit } = SlotSubmissionRunner({
      submit: vi.fn().mockResolvedValue(true),
      afterSuccess,
    })

    const result = await handleSlotSubmit(payload)

    expect(result).toBe(true)
    expect(afterSuccess).toHaveBeenCalledTimes(1)
  })

  it("submit 失敗時回傳 false 且不呼叫 afterSuccess", async () => {
    const afterSuccess = vi.fn()
    const { handleSlotSubmit } = SlotSubmissionRunner({
      submit: vi.fn().mockResolvedValue(false),
      afterSuccess,
    })

    const result = await handleSlotSubmit(payload)

    expect(result).toBe(false)
    expect(afterSuccess).not.toHaveBeenCalled()
  })

  it("未提供 afterSuccess 時不拋錯", async () => {
    const { handleSlotSubmit } = SlotSubmissionRunner({
      submit: vi.fn().mockResolvedValue(true),
    })

    const result = await handleSlotSubmit(payload)

    expect(result).toBe(true)
  })
})
