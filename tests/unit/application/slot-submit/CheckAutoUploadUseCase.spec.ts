import { CheckAutoUploadUseCase } from "@/application/slot-submit/CheckAutoUploadUseCase"

function makeGrid(allCorrect = true, invalidSlots: string[] = []) {
  return {
    checkAllCorrect: vi.fn().mockReturnValue({ allCorrect, invalidSlots }),
    getAllRowsData: vi.fn().mockReturnValue([{ id: 1 }, { id: 2 }]),
  }
}

describe("CheckAutoUploadUseCase", () => {
  it("全部正確且非 testing mode 時 shouldAutoUpload 為 true", () => {
    const uc = new CheckAutoUploadUseCase()

    const result = uc.execute({
      grid: makeGrid(true),
      isTestingMode: false,
      mode: "normal",
    })

    expect(result.allCorrect).toBe(true)
    expect(result.shouldAutoUpload).toBe(true)
    expect(result.pendingRows).toEqual([{ id: 1 }, { id: 2 }])
    expect(result.message).toBe("全部槽位綁定完成，準備自動上傳")
  })

  it("testing mode 時 shouldAutoUpload 為 false", () => {
    const uc = new CheckAutoUploadUseCase()

    const result = uc.execute({
      grid: makeGrid(true),
      isTestingMode: true,
      mode: "testing",
    })

    expect(result.shouldAutoUpload).toBe(false)
    expect(result.pendingRows).toBeNull()
    expect(result.message).toBeUndefined()
  })

  it("有 invalidSlots 時 shouldAutoUpload 為 false", () => {
    const uc = new CheckAutoUploadUseCase()

    const result = uc.execute({
      grid: makeGrid(false, ["10008"]),
      isTestingMode: false,
      mode: "normal",
    })

    expect(result.allCorrect).toBe(false)
    expect(result.invalidSlots).toEqual(["10008"])
    expect(result.shouldAutoUpload).toBe(false)
    expect(result.pendingRows).toBeNull()
  })
})
