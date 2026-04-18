import { StartProductionStatsUseCase } from "@/application/preproduction/StartProductionStatsUseCase"

type Row = { slotIdno: string }
type Unload = { id: number }
type Splice = { id: number }
type Ipqc = { id: number }

const statItemMap = new Map([["10008", 1]])

function makeDeps(overrides?: Partial<ConstructorParameters<typeof StartProductionStatsUseCase<Row, Unload, Splice, Ipqc>>[0]>) {
  return {
    startProduction: vi.fn().mockResolvedValue({ productionUuid: "uuid-123", statItemMap }),
    uploadUnload: vi.fn().mockResolvedValue(undefined),
    uploadSplice: vi.fn().mockResolvedValue(undefined),
    uploadIpqc: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

describe("StartProductionStatsUseCase", () => {
  it("呼叫 startProduction 並回傳 uuid", async () => {
    const deps = makeDeps()
    const uc = new StartProductionStatsUseCase(deps)

    const uuid = await uc.execute({
      rowData: [{ slotIdno: "10008" }],
      pendingUnloadRecords: [],
      pendingSpliceRecords: [],
    })

    expect(uuid).toBe("uuid-123")
    expect(deps.startProduction).toHaveBeenCalledWith([{ slotIdno: "10008" }])
  })

  it("有 pendingUnloadRecords 時逐筆上傳並回報成功", async () => {
    const deps = makeDeps()
    const onUnloadUploaded = vi.fn()
    const uc = new StartProductionStatsUseCase(deps)

    await uc.execute({
      rowData: [],
      pendingUnloadRecords: [{ id: 1 }, { id: 2 }],
      pendingSpliceRecords: [],
      onUnloadUploaded,
    })

    expect(deps.uploadUnload).toHaveBeenCalledTimes(2)
    expect(deps.uploadUnload).toHaveBeenCalledWith({ id: 1 }, statItemMap)
    expect(deps.uploadUnload).toHaveBeenCalledWith({ id: 2 }, statItemMap)
    expect(onUnloadUploaded).toHaveBeenCalledWith(true)
  })

  it("unload 部分失敗時 onUnloadUploaded 收到 false", async () => {
    const deps = makeDeps({
      uploadUnload: vi.fn().mockRejectedValue(new Error("fail")),
    })
    const onUnloadUploaded = vi.fn()
    const uc = new StartProductionStatsUseCase(deps)

    await uc.execute({
      rowData: [],
      pendingUnloadRecords: [{ id: 1 }],
      pendingSpliceRecords: [],
      onUnloadUploaded,
    })

    expect(onUnloadUploaded).toHaveBeenCalledWith(false)
  })

  it("有 pendingSpliceRecords 時逐筆上傳", async () => {
    const deps = makeDeps()
    const uc = new StartProductionStatsUseCase(deps)

    await uc.execute({
      rowData: [],
      pendingUnloadRecords: [],
      pendingSpliceRecords: [{ id: 10 }],
    })

    expect(deps.uploadSplice).toHaveBeenCalledWith({ id: 10 }, statItemMap)
  })

  it("有 pendingIpqcRecords + uploadIpqc 時上傳並回報", async () => {
    const deps = makeDeps()
    const onIpqcUploaded = vi.fn()
    const uc = new StartProductionStatsUseCase(deps)

    await uc.execute({
      rowData: [],
      pendingUnloadRecords: [],
      pendingSpliceRecords: [],
      pendingIpqcRecords: [{ id: 20 }],
      onIpqcUploaded,
    })

    expect(deps.uploadIpqc).toHaveBeenCalledWith({ id: 20 }, statItemMap)
    expect(onIpqcUploaded).toHaveBeenCalledWith(true)
  })

  it("無 uploadIpqc 時即使有 ipqcRecords 也不拋錯", async () => {
    const deps = makeDeps()
    delete (deps as any).uploadIpqc
    const uc = new StartProductionStatsUseCase(deps)

    const uuid = await uc.execute({
      rowData: [],
      pendingUnloadRecords: [],
      pendingSpliceRecords: [],
      pendingIpqcRecords: [{ id: 20 }],
    })

    expect(uuid).toBe("uuid-123")
  })

  it("所有 pending 都為空時只呼叫 startProduction", async () => {
    const deps = makeDeps()
    const uc = new StartProductionStatsUseCase(deps)

    await uc.execute({
      rowData: [{ slotIdno: "10008" }],
      pendingUnloadRecords: [],
      pendingSpliceRecords: [],
    })

    expect(deps.uploadUnload).not.toHaveBeenCalled()
    expect(deps.uploadSplice).not.toHaveBeenCalled()
    expect(deps.uploadIpqc).not.toHaveBeenCalled()
  })
})
