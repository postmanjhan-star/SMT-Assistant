import { startFujiProductionStats } from '@/infra/fuji/production/FujiProductionApi'
import { stopFujiProductionStats } from '@/infra/fuji/production/FujiProductionApi'
import { fetchFujiProductionSlots } from '@/infra/fuji/production/FujiProductionApi'
import { ApiMaterialRepository } from '@/infra/material/ApiMaterialRepository'
import { SmtService } from '@/client'
import type { FujiFeedRecordCreate } from '@/client'
import type { MaterialRepository, MaterialRepositoryResult } from '@/application/barcode-scan/BarcodeScanDeps'

export type FujiPreproductionDeps = {
  startProduction: typeof startFujiProductionStats
  stopProduction: (uuid: string) => Promise<unknown>
  fetchSlots: typeof fetchFujiProductionSlots
  createMaterialRepository: () => MaterialRepository
  fetchMaterialInventory: (idno: string) => Promise<MaterialRepositoryResult>
  uploadItemStatRoll: (payload: FujiFeedRecordCreate) => Promise<unknown>
}

export function createFujiPreproductionDeps(
  overrides: Partial<FujiPreproductionDeps> = {}
): FujiPreproductionDeps {
  return {
    startProduction: startFujiProductionStats,
    stopProduction: (uuid) => stopFujiProductionStats(uuid),
    fetchSlots: fetchFujiProductionSlots,
    createMaterialRepository: () => new ApiMaterialRepository(),
    fetchMaterialInventory: (idno) => new ApiMaterialRepository().fetchByBarcode(idno),
    uploadItemStatRoll: (payload) =>
      SmtService.addFujiMounterItemStatRoll({ requestBody: payload }),
    ...overrides,
  }
}
