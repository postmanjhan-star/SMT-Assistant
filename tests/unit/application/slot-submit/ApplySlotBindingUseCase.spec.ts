import { ApplySlotBindingUseCase } from "@/application/slot-submit/ApplySlotBindingUseCase"

function makeGrid() {
  return {
    hasRow: vi.fn().mockReturnValue(true),
    cleanErrorMaterialInventory: vi.fn(),
    applyBindingSuccess: vi.fn(),
    applyWarningBinding: vi.fn().mockReturnValue(true),
    markMismatch: vi.fn(),
    deselectRow: vi.fn().mockReturnValue(true),
    checkAllCorrect: vi.fn(),
    getAllRowsData: vi.fn(),
  }
}

describe("ApplySlotBindingUseCase", () => {
  describe("applyMatch", () => {
    it("row 存在時呼叫 applyBindingSuccess 並回傳 true", () => {
      const grid = makeGrid()
      const uc = new ApplySlotBindingUseCase({ grid })

      const result = uc.applyMatch("10008", { idno: "MAT-1", remark: "ok" })

      expect(result).toBe(true)
      expect(grid.applyBindingSuccess).toHaveBeenCalledWith("10008", "MAT-1", "ok")
    })

    it("有 input.slot 時先呼叫 cleanErrorMaterialInventory", () => {
      const grid = makeGrid()
      const uc = new ApplySlotBindingUseCase({ grid })

      uc.applyMatch("10008", { idno: "MAT-1" }, { slot: "1", subSlot: "L" })

      expect(grid.cleanErrorMaterialInventory).toHaveBeenCalledWith("MAT-1", "1", "L")
      expect(grid.applyBindingSuccess).toHaveBeenCalled()
    })

    it("row 不存在時回傳 false 且不呼叫 grid", () => {
      const grid = makeGrid()
      grid.hasRow.mockReturnValue(false)
      const uc = new ApplySlotBindingUseCase({ grid })

      const result = uc.applyMatch("10008")

      expect(result).toBe(false)
      expect(grid.applyBindingSuccess).not.toHaveBeenCalled()
    })

    it("material 未提供時使用空字串預設值", () => {
      const grid = makeGrid()
      const uc = new ApplySlotBindingUseCase({ grid })

      uc.applyMatch("10008")

      expect(grid.applyBindingSuccess).toHaveBeenCalledWith("10008", "", "")
    })
  })

  describe("applyWarningBinding", () => {
    it("委託給 grid.applyWarningBinding", () => {
      const grid = makeGrid()
      const uc = new ApplySlotBindingUseCase({ grid })

      const result = uc.applyWarningBinding("10008", { idno: "MAT-1" }, "warn")

      expect(result).toBe(true)
      expect(grid.applyWarningBinding).toHaveBeenCalledWith("10008", "MAT-1", "warn")
    })
  })

  describe("applyMismatch", () => {
    it("呼叫 markMismatch + deselectRow", () => {
      const grid = makeGrid()
      const uc = new ApplySlotBindingUseCase({ grid })

      uc.applyMismatch({ slot: "1", subSlot: "L" }, "10008", "MAT-1")

      expect(grid.markMismatch).toHaveBeenCalledWith("1", "L", "MAT-1")
      expect(grid.deselectRow).toHaveBeenCalledWith("10008")
    })
  })
})
