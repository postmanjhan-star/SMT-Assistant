import { ProductionLifecycleUseCase } from "@/application/preproduction/ProductionLifecycleUseCase"

function makeDeps(overrides?: { extraQueryParamsToRemove?: string[] }) {
  return {
    start: vi.fn(),
    stop: vi.fn().mockResolvedValue(undefined),
    buildProductionPath: vi.fn((uuid: string) => `/production/${uuid}`),
    ...overrides,
  }
}

describe("ProductionLifecycleUseCase", () => {
  describe("handleStarted", () => {
    it("呼叫 start 並回傳正確的 replace/push intent", () => {
      const deps = makeDeps()
      const uc = new ProductionLifecycleUseCase(deps)

      const result = uc.handleStarted({
        uuid: "uuid-123",
        currentPath: "/detail",
        currentQuery: { machine: "M1" },
      })

      expect(deps.start).toHaveBeenCalledWith("uuid-123")
      expect(result.replace).toEqual({
        path: "/detail",
        query: { machine: "M1", uuid: "uuid-123" },
      })
      expect(result.push).toEqual({
        path: "/production/uuid-123",
        query: { machine: "M1" },
      })
    })

    it("replace query 加入 uuid；push query 移除 uuid", () => {
      const deps = makeDeps()
      const uc = new ProductionLifecycleUseCase(deps)

      const result = uc.handleStarted({
        uuid: "uuid-456",
        currentPath: "/detail",
        currentQuery: { machine: "M1", uuid: "old-uuid" },
      })

      expect(result.replace.query.uuid).toBe("uuid-456")
      expect(result.push.query).not.toHaveProperty("uuid")
    })

    it("extraQueryParamsToRemove 從 replace 和 push query 中移除指定參數", () => {
      const deps = makeDeps({ extraQueryParamsToRemove: ["side", "temp"] })
      const uc = new ProductionLifecycleUseCase(deps)

      const result = uc.handleStarted({
        uuid: "uuid-789",
        currentPath: "/detail",
        currentQuery: { machine: "M1", side: "A", temp: "1" },
      })

      expect(result.replace.query).not.toHaveProperty("side")
      expect(result.replace.query).not.toHaveProperty("temp")
      expect(result.push.query).not.toHaveProperty("side")
      expect(result.push.query).not.toHaveProperty("temp")
      expect(result.replace.query.machine).toBe("M1")
    })
  })

  describe("stop", () => {
    it("委託給 deps.stop", async () => {
      const deps = makeDeps()
      const uc = new ProductionLifecycleUseCase(deps)

      await uc.stop()

      expect(deps.stop).toHaveBeenCalledTimes(1)
    })
  })
})
