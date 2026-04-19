import { SmtService, StErpService } from "@/client"

export type PanasonicHomeDeps = {
  findMounterIdnosByProductIdno: (productIdno: string) => Promise<string[]>
  getMounterMaterialSlotPairs: (params: {
    workOrderIdno: string
    productIdno: string
    mounterIdno: string
    boardSide: "TOP" | "BOTTOM" | "DUPLEX"
    machineSide: "1" | "2" | "1+2" | null
    testingMode?: boolean | null
    testingProductIdno?: string | null
  }) => Promise<unknown>
  getStWorkOrder: (workOrderIdno: string) => Promise<{ product_idno?: string | null } | null>
}

export function createPanasonicHomeDeps(
  overrides: Partial<PanasonicHomeDeps> = {}
): PanasonicHomeDeps {
  return {
    findMounterIdnosByProductIdno: (productIdno) =>
      SmtService.findPanasonicMounterIdnosByProductIdno({ productIdno }),
    getMounterMaterialSlotPairs: (params) =>
      SmtService.getPanasonicMounterMaterialSlotPairs(params),
    getStWorkOrder: (workOrderIdno) =>
      StErpService.getStWorkOrder({ workOrderIdno }),
    ...overrides,
  }
}
