import { ApiSmtProductionRepository } from '@/infrastructure/repositories/SmtProductionRepository'
import { ApiMaterialRepository } from '@/infra/material/ApiMaterialRepository'
import { PostProductionRecordApi } from '@/infra/post-production/PostProductionRecordApi'
import { startPanasonicProductionStats } from '@/infra/panasonic/production/PanasonicProductionApi'
import { stopPanasonicProductionStats } from '@/infra/panasonic/production/PanasonicProductionApi'
import { fetchPanasonicMounterMaterialSlotPairs } from '@/infra/panasonic/PanasonicMounterMaterialSlotApi'
import { PostProductionRecordUploader } from '@/application/post-production-feed/PostProductionRecordUploader'
import { ProductionLifecycleUseCase } from '@/application/preproduction/ProductionLifecycleUseCase'
import { SubmitRollShortageUseCase } from '@/application/preproduction/SubmitRollShortageUseCase'
import { SubmitSlotUseCase } from '@/application/preproduction/SubmitSlotUseCase'
import type {
  PreproductionPanasonicDeps,
  PostproductionPanasonicDeps,
} from '@/application/panasonic/di/PanasonicWorkflowDeps'

export type { PreproductionPanasonicDeps, PostproductionPanasonicDeps }

export function createPreproductionPanasonicDeps(
  overrides: Partial<PreproductionPanasonicDeps> = {}
): PreproductionPanasonicDeps {
  return {
    createSmtRepository: () => new ApiSmtProductionRepository(),
    createSubmitSlotUseCase: (deps) => new SubmitSlotUseCase(deps),
    createSubmitRollShortageUseCase: (deps) => new SubmitRollShortageUseCase(deps),
    createProductionLifecycleUseCase: (deps) => new ProductionLifecycleUseCase(deps),
    now: () => new Date().toISOString(),
    createMaterialRepository: () => new ApiMaterialRepository(),
    stopProduction: (uuid) =>
      stopPanasonicProductionStats({ uuid, endTime: new Date().toISOString() }),
    fetchSlots: fetchPanasonicMounterMaterialSlotPairs,
    startProduction: (payload) =>
      startPanasonicProductionStats(payload) as Promise<import('@/client').PanasonicMounterItemStatRead[]>,
    ...overrides,
  }
}

export function createPostproductionPanasonicDeps(
  overrides: Partial<PostproductionPanasonicDeps> = {}
): PostproductionPanasonicDeps {
  return {
    createRecordApi: () => new PostProductionRecordApi(),
    createRecordUploader: (api) => new PostProductionRecordUploader(api),
    startPanasonicProduction: (payload) => startPanasonicProductionStats(payload),
    ...overrides,
  }
}
