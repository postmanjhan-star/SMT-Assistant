import {
  SubmitPanasonicRollShortageUseCase,
  type PanasonicRollShortageRow,
} from "@/application/panasonic/roll-shortage/SubmitPanasonicRollShortageUseCase"
import { ApiError, CheckMaterialMatchEnum } from "@/client"

type TestRow = PanasonicRollShortageRow & { materialIdno: string }

function makeRow(overrides?: Partial<TestRow>): TestRow {
  return {
    slotIdno: "10008",
    subSlotIdno: "L",
    appendedMaterialInventoryIdno: "",
    materialIdno: "MAT-001",
    ...overrides,
  }
}

function makeDeps(rows: TestRow[] = [makeRow()]) {
  return {
    getRowData: vi.fn().mockReturnValue(rows),
    getStatBySlotIdno: vi.fn().mockReturnValue({ id: 1 }),
    fetchMaterialInventory: vi.fn().mockResolvedValue({ material_idno: "MAT-001" }),
    uploadRollRecord: vi.fn().mockResolvedValue({}),
    isTestingMode: vi.fn().mockReturnValue(false),
    operatorId: vi.fn().mockReturnValue("OP-99"),
    now: vi.fn().mockReturnValue("2024-06-01T00:00:00Z"),
    matchRowsByMaterialIdno: vi.fn().mockReturnValue(rows),
    resolveRowId: vi.fn((row: TestRow) => `${row.slotIdno}-${row.subSlotIdno ?? ""}`),
  }
}

function makeApiError(status: number): ApiError {
  return new ApiError(
    { method: "GET", url: "/test" } as any,
    { status, statusText: "Error", url: "/test", ok: false, body: null } as any,
    `HTTP ${status}`
  )
}

describe("SubmitPanasonicRollShortageUseCase", () => {
  describe("validation", () => {
    it("materialInventoryIdno 為空時回傳 error", async () => {
      const uc = new SubmitPanasonicRollShortageUseCase(makeDeps())

      const result = await uc.execute({
        materialInventoryIdno: "",
        slotIdno: "10008-L",
        type: "NEW",
      })

      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error.code).toBe("materialInventoryIdno_required")
    })

    it("slotIdno 為空時回傳 error", async () => {
      const uc = new SubmitPanasonicRollShortageUseCase(makeDeps())

      const result = await uc.execute({
        materialInventoryIdno: "PACK-001",
        slotIdno: "",
        type: "NEW",
      })

      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error.code).toBe("slotIdno_required")
    })

    it("type 為空時回傳 error", async () => {
      const uc = new SubmitPanasonicRollShortageUseCase(makeDeps())

      const result = await uc.execute({
        materialInventoryIdno: "PACK-001",
        slotIdno: "10008-L",
        type: "",
      })

      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error.code).toBe("type_required")
    })
  })

  describe("stat lookup", () => {
    it("stat 找不到時回傳 stat_not_found", async () => {
      const deps = makeDeps()
      deps.getStatBySlotIdno.mockReturnValue(null)
      const uc = new SubmitPanasonicRollShortageUseCase(deps)

      const result = await uc.execute({
        materialInventoryIdno: "PACK-001",
        slotIdno: "10008-L",
        type: "NEW",
      })

      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error.code).toBe("stat_not_found")
    })
  })

  describe("row lookup", () => {
    it("grid 中找不到對應 row 時回傳 row_not_found", async () => {
      const deps = makeDeps([makeRow({ slotIdno: "99999" })])
      const uc = new SubmitPanasonicRollShortageUseCase(deps)

      const result = await uc.execute({
        materialInventoryIdno: "PACK-001",
        slotIdno: "10008-L",
        type: "NEW",
      })

      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error.code).toBe("row_not_found")
    })
  })

  describe("successful flow", () => {
    it("成功時上傳 record 並回傳 update", async () => {
      const deps = makeDeps()
      const uc = new SubmitPanasonicRollShortageUseCase(deps)

      const result = await uc.execute({
        materialInventoryIdno: "PACK-001",
        slotIdno: "10008-L",
        type: "NEW",
      })

      expect(result.ok).toBe(true)
      if (!result.ok) return

      expect(deps.uploadRollRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          statId: 1,
          operatorId: "OP-99",
          operationTime: "2024-06-01T00:00:00Z",
          slotIdno: "10008",
          subSlotIdno: "L",
          materialPackCode: "PACK-001",
          feedMaterialPackType: "NEW",
          checkPackCodeMatch: CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK,
        })
      )

      expect(result.update.rowId).toBe("10008-L")
      expect(result.update.newAppendedMaterialInventoryIdno).toBe("PACK-001")
    })

    it("已有 appendedMaterialInventoryIdno 時追加", async () => {
      const deps = makeDeps([makeRow({ appendedMaterialInventoryIdno: "OLD-001" })])
      const uc = new SubmitPanasonicRollShortageUseCase(deps)

      const result = await uc.execute({
        materialInventoryIdno: "PACK-002",
        slotIdno: "10008-L",
        type: "NEW",
      })

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.update.newAppendedMaterialInventoryIdno).toBe("OLD-001, PACK-002")
      }
    })
  })

  describe("material matching", () => {
    it("matchRowsByMaterialIdno 回傳空陣列時回傳 no_material_in_grid", async () => {
      const deps = makeDeps()
      deps.matchRowsByMaterialIdno.mockReturnValue([])
      const uc = new SubmitPanasonicRollShortageUseCase(deps)

      const result = await uc.execute({
        materialInventoryIdno: "PACK-001",
        slotIdno: "10008-L",
        type: "NEW",
      })

      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error.code).toBe("no_material_in_grid")
    })
  })

  describe("API error handling", () => {
    it("404 非 testing mode 時回傳 inventory_not_found", async () => {
      const deps = makeDeps()
      deps.fetchMaterialInventory.mockRejectedValue(makeApiError(404))
      const uc = new SubmitPanasonicRollShortageUseCase(deps)

      const result = await uc.execute({
        materialInventoryIdno: "PACK-001",
        slotIdno: "10008-L",
        type: "NEW",
      })

      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error.code).toBe("inventory_not_found")
    })

    it("404 + testing mode 時以虛擬物料成功", async () => {
      const deps = makeDeps()
      deps.fetchMaterialInventory.mockRejectedValue(makeApiError(404))
      deps.isTestingMode.mockReturnValue(true)
      const uc = new SubmitPanasonicRollShortageUseCase(deps)

      const result = await uc.execute({
        materialInventoryIdno: "PACK-TEST",
        slotIdno: "10008-L",
        type: "NEW",
      })

      expect(result.ok).toBe(true)
      if (!result.ok) return

      expect(result.info).toEqual({
        code: "testing_virtual_material",
        idno: "PACK-TEST",
      })

      expect(deps.uploadRollRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          checkPackCodeMatch: CheckMaterialMatchEnum.TESTING_MATERIAL_PACK,
        })
      )
    })

    it("504 回傳 erp_timeout", async () => {
      const deps = makeDeps()
      deps.fetchMaterialInventory.mockRejectedValue(makeApiError(504))
      const uc = new SubmitPanasonicRollShortageUseCase(deps)

      const result = await uc.execute({
        materialInventoryIdno: "PACK-001",
        slotIdno: "10008-L",
        type: "NEW",
      })

      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error.code).toBe("erp_timeout")
    })

    it("502 回傳 erp_bad_gateway", async () => {
      const deps = makeDeps()
      deps.fetchMaterialInventory.mockRejectedValue(makeApiError(502))
      const uc = new SubmitPanasonicRollShortageUseCase(deps)

      const result = await uc.execute({
        materialInventoryIdno: "PACK-001",
        slotIdno: "10008-L",
        type: "NEW",
      })

      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error.code).toBe("erp_bad_gateway")
    })

    it("500 回傳 server_error", async () => {
      const deps = makeDeps()
      deps.fetchMaterialInventory.mockRejectedValue(makeApiError(500))
      const uc = new SubmitPanasonicRollShortageUseCase(deps)

      const result = await uc.execute({
        materialInventoryIdno: "PACK-001",
        slotIdno: "10008-L",
        type: "NEW",
      })

      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error.code).toBe("server_error")
    })

    it("非 ApiError 回傳 unknown_error", async () => {
      const deps = makeDeps()
      deps.fetchMaterialInventory.mockRejectedValue(new Error("network"))
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})
      const uc = new SubmitPanasonicRollShortageUseCase(deps)

      const result = await uc.execute({
        materialInventoryIdno: "PACK-001",
        slotIdno: "10008-L",
        type: "NEW",
      })

      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error.code).toBe("unknown_error")
      consoleSpy.mockRestore()
    })
  })

  describe("resolveRowId", () => {
    it("未提供 resolveRowId 時使用預設格式", async () => {
      const deps = makeDeps()
      delete (deps as any).resolveRowId
      const uc = new SubmitPanasonicRollShortageUseCase(deps)

      const result = await uc.execute({
        materialInventoryIdno: "PACK-001",
        slotIdno: "10008-L",
        type: "NEW",
      })

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.update.rowId).toBe("10008-L")
      }
    })
  })
})
