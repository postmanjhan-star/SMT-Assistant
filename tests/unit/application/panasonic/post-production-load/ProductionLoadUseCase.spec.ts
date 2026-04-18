import { loadPanasonicProduction } from "@/application/panasonic/post-production-load/ProductionLoadUseCase"
import { SmtService } from "@/client"

vi.mock("@/client", () => ({
  SmtService: {
    getThePanasonicItemStatsOfProduction: vi.fn(),
    getTheStatsOfLogsByUuid: vi.fn(),
  },
}))

vi.mock("@/domain/production/buildPanasonicRowData", () => ({
  buildProductionRowData: vi.fn(
    (stats: any[], logs: any[]) =>
      stats.map((s: any) => ({ statId: s.id, logsCount: logs.length }))
  ),
}))

describe("loadPanasonicProduction", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("成功載入 stats + logs 並回傳 rowData", async () => {
    const mockStats = [{ id: 1, production_end: null }]
    const mockLogs = [{ id: 10 }]
    vi.mocked(SmtService.getThePanasonicItemStatsOfProduction).mockResolvedValue(mockStats as any)
    vi.mocked(SmtService.getTheStatsOfLogsByUuid).mockResolvedValue(mockLogs as any)

    const result = await loadPanasonicProduction("uuid-123")

    expect(SmtService.getThePanasonicItemStatsOfProduction).toHaveBeenCalledWith({ uuid: "uuid-123" })
    expect(SmtService.getTheStatsOfLogsByUuid).toHaveBeenCalledWith({ uuid: "uuid-123" })
    expect(result.mounterData).toBe(mockStats)
    expect(result.rowData).toEqual([{ statId: 1, logsCount: 1 }])
    expect(result.productionStarted).toBe(true)
  })

  it("production_end 不為 null 時 productionStarted 為 false", async () => {
    const mockStats = [{ id: 1, production_end: "2024-06-01" }]
    vi.mocked(SmtService.getThePanasonicItemStatsOfProduction).mockResolvedValue(mockStats as any)
    vi.mocked(SmtService.getTheStatsOfLogsByUuid).mockResolvedValue([] as any)

    const result = await loadPanasonicProduction("uuid-123")

    expect(result.productionStarted).toBe(false)
  })

  it("logs 載入失敗時仍正常回傳（logs 為空陣列）", async () => {
    const mockStats = [{ id: 1, production_end: null }]
    vi.mocked(SmtService.getThePanasonicItemStatsOfProduction).mockResolvedValue(mockStats as any)
    vi.mocked(SmtService.getTheStatsOfLogsByUuid).mockRejectedValue(new Error("network error"))

    const result = await loadPanasonicProduction("uuid-123")

    expect(result.mounterData).toBe(mockStats)
    expect(result.rowData).toEqual([{ statId: 1, logsCount: 0 }])
  })

  it("stats 為空時 productionStarted 為 false", async () => {
    vi.mocked(SmtService.getThePanasonicItemStatsOfProduction).mockResolvedValue([] as any)
    vi.mocked(SmtService.getTheStatsOfLogsByUuid).mockResolvedValue([] as any)

    const result = await loadPanasonicProduction("uuid-123")

    expect(result.productionStarted).toBe(false)
    expect(result.mounterData).toEqual([])
  })

  it("uuid 為空時拋出錯誤", async () => {
    await expect(loadPanasonicProduction("")).rejects.toThrow("productionUuid is required")
  })
})
