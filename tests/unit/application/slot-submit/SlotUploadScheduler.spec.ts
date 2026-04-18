import { SlotUploadScheduler } from "@/application/slot-submit/SlotUploadScheduler"

describe("SlotUploadScheduler", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("schedule 後延遲執行 onUpload", async () => {
    const onUpload = vi.fn()
    const scheduler = new SlotUploadScheduler({
      checkShouldUpload: () => ({ shouldUpload: true, rows: [{ id: 1 }] }),
      onUpload,
      delayMs: 100,
    })

    scheduler.schedule()

    expect(onUpload).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(100)
    expect(onUpload).toHaveBeenCalledWith([{ id: 1 }])
  })

  it("shouldUpload 為 false 時不呼叫 onUpload", async () => {
    const onUpload = vi.fn()
    const scheduler = new SlotUploadScheduler({
      checkShouldUpload: () => ({ shouldUpload: false, rows: null }),
      onUpload,
      delayMs: 100,
    })

    scheduler.schedule()
    await vi.advanceTimersByTimeAsync(100)

    expect(onUpload).not.toHaveBeenCalled()
  })

  it("rows 為空陣列時不呼叫 onUpload", async () => {
    const onUpload = vi.fn()
    const scheduler = new SlotUploadScheduler({
      checkShouldUpload: () => ({ shouldUpload: true, rows: [] }),
      onUpload,
      delayMs: 100,
    })

    scheduler.schedule()
    await vi.advanceTimersByTimeAsync(100)

    expect(onUpload).not.toHaveBeenCalled()
  })

  it("重複 schedule 只執行一次（debounce）", async () => {
    const onUpload = vi.fn()
    const scheduler = new SlotUploadScheduler({
      checkShouldUpload: () => ({ shouldUpload: true, rows: [{ id: 1 }] }),
      onUpload,
      delayMs: 100,
    })

    scheduler.schedule()
    scheduler.schedule()
    scheduler.schedule()
    await vi.advanceTimersByTimeAsync(100)

    expect(onUpload).toHaveBeenCalledTimes(1)
  })

  it("cancel 後不執行 onUpload", async () => {
    const onUpload = vi.fn()
    const scheduler = new SlotUploadScheduler({
      checkShouldUpload: () => ({ shouldUpload: true, rows: [{ id: 1 }] }),
      onUpload,
      delayMs: 100,
    })

    scheduler.schedule()
    scheduler.cancel()
    await vi.advanceTimersByTimeAsync(100)

    expect(onUpload).not.toHaveBeenCalled()
  })

  it("未指定 delayMs 時預設 300ms", async () => {
    const onUpload = vi.fn()
    const scheduler = new SlotUploadScheduler({
      checkShouldUpload: () => ({ shouldUpload: true, rows: [{ id: 1 }] }),
      onUpload,
    })

    scheduler.schedule()
    await vi.advanceTimersByTimeAsync(299)
    expect(onUpload).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(onUpload).toHaveBeenCalledTimes(1)
  })
})
