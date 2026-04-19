import { ApiMaterialRepository } from "@/infra/material/ApiMaterialRepository"
import type { MaterialRepository } from "@/application/barcode-scan/BarcodeScanDeps"

export type BarcodeScanDepsFactory = {
  createMaterialRepository: () => MaterialRepository
}

export function createBarcodeScanDeps(
  overrides: Partial<BarcodeScanDepsFactory> = {}
): BarcodeScanDepsFactory {
  return {
    createMaterialRepository: () => new ApiMaterialRepository(),
    ...overrides,
  }
}
