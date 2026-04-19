import { SmtService, StErpService } from "@/client"

export type FujiHomeDeps = {
  findMounterIdnosByProductIdno: (productIdno: string) => Promise<string[]>
  getMounterMaterialSlotPairs: (params: {
    workOrderIdno: string
    boardSide: "TOP" | "BOTTOM" | "DUPLEX"
    productIdno: string
    mounterIdno: string
    testingMode?: boolean | null
    testingProductIdno?: string | null
  }) => Promise<unknown>
  getStWorkOrder: (workOrderIdno: string) => Promise<{ product_idno?: string | null } | null>
}

export function createFujiHomeDeps(
  overrides: Partial<FujiHomeDeps> = {}
): FujiHomeDeps {
  return {
    findMounterIdnosByProductIdno: (productIdno) =>
      SmtService.findFujiMounterIdnosByProductIdno({ productIdno }),
    getMounterMaterialSlotPairs: (params) =>
      SmtService.getFujiMounterMaterialSlotPairs(params),
    getStWorkOrder: (workOrderIdno) =>
      StErpService.getStWorkOrder({ workOrderIdno }),
    ...overrides,
  }
}
