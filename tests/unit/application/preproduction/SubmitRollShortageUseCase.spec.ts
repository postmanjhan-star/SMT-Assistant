import { SubmitRollShortageUseCase } from "@/application/preproduction/SubmitRollShortageUseCase"
import type { ProductionRowModel } from "@/pages/mounter/panasonic/types/production"

vi.mock("@/client", () => ({
  ApiError: class ApiError extends Error {
    status: number
    constructor(
      _req: any,
      res: { status: number; statusText: string; url: string },
      msg: string
    ) {
      super(msg)
      this.status = res.status
    }
  },
  CheckMaterialMatchEnum: {
    MATCHED_MATERIAL_PACK: "MATCHED_MATERIAL_PACK",
    TESTING_MATERIAL_PACK: "TESTING_MATERIAL_PACK",
  },
}))

function makeRow(overrides?: Partial<ProductionRowModel>): ProductionRowModel {
  return {
    slotIdno: "10008",
    subSlotIdno: "L",
    appendedMaterialInventoryIdno: "",
    materialIdno: "MAT-001",
    ...overrides,
  } as ProductionRowModel
}

function makeDeps(rows: ProductionRowModel[] = [makeRow()]) {
  return {
    repository: {
      fetchMaterialInventory: vi.fn().mockResolvedValue({ material_idno: "MAT-001" }),
      addPanasonicMounterItemStatRoll: vi.fn().mockResolvedValue({}),
    },
    getRowData: vi.fn().mockReturnValue(rows),
    getStatBySlotIdno: vi.fn().mockReturnValue({ id: 1 }),
    isTestingMode: vi.fn().mockReturnValue(false),
    operatorId: vi.fn().mockReturnValue("OP-99"),
    now: vi.fn().mockReturnValue("2024-06-01T00:00:00Z"),
  }
}

describe("SubmitRollShortageUseCase", () => {
  it("委託給 SubmitPanasonicRollShortageUseCase 並回傳結果", async () => {
    const deps = makeDeps()
    const uc = new SubmitRollShortageUseCase(deps as any)

    const result = await uc.execute({
      materialInventoryIdno: "PACK-001",
      slotIdno: "10008-L",
      type: "NEW_MATERIAL_PACK",
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.update.rowId).toBe("10008-L")
    }
  })

  it("驗證失敗時回傳 error", async () => {
    const deps = makeDeps()
    const uc = new SubmitRollShortageUseCase(deps as any)

    const result = await uc.execute({
      materialInventoryIdno: "",
      slotIdno: "10008-L",
      type: "NEW_MATERIAL_PACK",
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe("materialInventoryIdno_required")
    }
  })

  it("stat 找不到時回傳 stat_not_found", async () => {
    const deps = makeDeps()
    deps.getStatBySlotIdno.mockReturnValue(null)
    const uc = new SubmitRollShortageUseCase(deps as any)

    const result = await uc.execute({
      materialInventoryIdno: "PACK-001",
      slotIdno: "10008-L",
      type: "NEW_MATERIAL_PACK",
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe("stat_not_found")
    }
  })
})
