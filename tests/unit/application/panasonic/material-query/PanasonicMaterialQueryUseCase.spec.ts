import { loadPanasonicMaterialQueryRows } from "@/application/panasonic/material-query/PanasonicMaterialQueryUseCase"
import { SmtService } from "@/client"

vi.mock("@/client", () => ({
  SmtService: {
    getTheStatsOfLogsByUuid: vi.fn(),
  },
}))

describe("loadPanasonicMaterialQueryRows", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("回傳轉換後的 row model", async () => {
    const mockLog = {
      id: 1,
      check_pack_code_match: "MATCHED_MATERIAL_PACK",
      slot_idno: "10008",
      sub_slot_idno: "L",
      material_pack_code: "PACK-001",
      feed_material_pack_type: "NEW_MATERIAL_PACK",
      operator_id: "OP-99",
      created_at: "2024-06-01T00:00:00Z",
    }
    vi.mocked(SmtService.getTheStatsOfLogsByUuid).mockResolvedValue([mockLog] as any)

    const rows = await loadPanasonicMaterialQueryRows("uuid-123")

    expect(SmtService.getTheStatsOfLogsByUuid).toHaveBeenCalledWith({ uuid: "uuid-123" })
    expect(rows).toHaveLength(1)
    expect(rows[0]).toEqual({
      id: 1,
      correct: "MATCHED_MATERIAL_PACK",
      slotIdno: "10008",
      subSlotIdno: "L",
      materialInventoryIdno: "PACK-001",
      materialInventoryType: "NEW_MATERIAL_PACK",
      operatorName: "OP-99",
      checktime: "2024-06-01T00:00:00Z",
      remark: "",
    })
  })

  it("TESTING_MATERIAL_PACK 時 remark 為虛擬測試物料", async () => {
    const mockLog = {
      id: 2,
      check_pack_code_match: "TESTING_MATERIAL_PACK",
      slot_idno: "10009",
      sub_slot_idno: "",
      material_pack_code: "PACK-TEST",
      feed_material_pack_type: null,
      operator_id: null,
      created_at: "2024-06-01T00:00:00Z",
    }
    vi.mocked(SmtService.getTheStatsOfLogsByUuid).mockResolvedValue([mockLog] as any)

    const rows = await loadPanasonicMaterialQueryRows("uuid-456")

    expect(rows[0].remark).toBe("[虛擬測試物料]")
    expect(rows[0].operatorName).toBe("")
  })

  it("uuid 為空時拋出錯誤", async () => {
    await expect(loadPanasonicMaterialQueryRows("")).rejects.toThrow("uuid is required")
    await expect(loadPanasonicMaterialQueryRows("  ")).rejects.toThrow("uuid is required")
  })
})
