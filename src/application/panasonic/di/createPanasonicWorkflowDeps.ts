import { ApiSmtProductionRepository, type SmtProductionRepository } from "@/infrastructure/repositories/SmtProductionRepository"
import {
  ProductionLifecycleUseCase,
  type ProductionLifecycleDeps,
} from "@/application/preproduction/ProductionLifecycleUseCase"
import {
  SubmitRollShortageUseCase,
  type SubmitRollShortageUseCaseDeps,
} from "@/application/preproduction/SubmitRollShortageUseCase"
import {
  SubmitSlotUseCase,
  type SubmitSlotUseCaseDeps,
} from "@/application/preproduction/SubmitSlotUseCase"
import { PostProductionRecordApi } from "@/infra/post-production/PostProductionRecordApi"
import { PostProductionRecordUploader } from "@/application/post-production-feed/PostProductionRecordUploader"
import { startPanasonicProduction } from "@/application/panasonic/production/StartPanasonicProduction"
import { ApiMaterialRepository } from "@/infra/material/ApiMaterialRepository"
import type { MaterialRepository } from "@/application/barcode-scan/BarcodeScanDeps"

export type PreproductionPanasonicDeps = {
  createSmtRepository: () => SmtProductionRepository
  createSubmitSlotUseCase: (deps: SubmitSlotUseCaseDeps) => SubmitSlotUseCase
  createSubmitRollShortageUseCase: (
    deps: SubmitRollShortageUseCaseDeps
  ) => SubmitRollShortageUseCase
  createProductionLifecycleUseCase: (
    deps: ProductionLifecycleDeps
  ) => ProductionLifecycleUseCase
  now: () => string
  createMaterialRepository: () => MaterialRepository
}

export type PostproductionPanasonicDeps = {
  createRecordApi: () => PostProductionRecordApi
  createRecordUploader: (api: PostProductionRecordApi) => PostProductionRecordUploader
  startPanasonicProduction: typeof startPanasonicProduction
}

export function createPreproductionPanasonicDeps(
  overrides: Partial<PreproductionPanasonicDeps> = {}
): PreproductionPanasonicDeps {
  return {
    createSmtRepository: () => new ApiSmtProductionRepository(),
    createSubmitSlotUseCase: (deps) => new SubmitSlotUseCase(deps),
    createSubmitRollShortageUseCase: (deps) => new SubmitRollShortageUseCase(deps),
    createProductionLifecycleUseCase: (deps) =>
      new ProductionLifecycleUseCase(deps),
    now: () => new Date().toISOString(),
    createMaterialRepository: () => new ApiMaterialRepository(),
    ...overrides,
  }
}

export function createPostproductionPanasonicDeps(
  overrides: Partial<PostproductionPanasonicDeps> = {}
): PostproductionPanasonicDeps {
  return {
    createRecordApi: () => new PostProductionRecordApi(),
    createRecordUploader: (api) => new PostProductionRecordUploader(api),
    startPanasonicProduction,
    ...overrides,
  }
}
