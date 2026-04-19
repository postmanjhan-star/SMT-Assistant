import { ApiSmtProductionRepository } from '@/infrastructure/repositories/SmtProductionRepository'
import { ApiMaterialRepository } from '@/infra/material/ApiMaterialRepository'
import { PostProductionRecordApi } from '@/infra/post-production/PostProductionRecordApi'
import { startPanasonicProductionStats } from '@/infra/panasonic/production/PanasonicProductionApi'
import { stopPanasonicProductionStats } from '@/infra/panasonic/production/PanasonicProductionApi'
import { fetchPanasonicMounterMaterialSlotPairs } from '@/infra/panasonic/PanasonicMounterMaterialSlotApi'
import { SmtService } from '@/client'
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
    uploadItemStatRoll: (payload) =>
      SmtService.addPanasonicMounterItemStatRoll({ requestBody: payload }),
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
    stopProduction: (uuid) =>
      stopPanasonicProductionStats({ uuid, endTime: new Date().toISOString() }),
    inspectionUpload: ({ statId, slotIdno, subSlotIdno, materialPackCode, operatorIdno, checkPackCodeMatch }) =>
      SmtService.addPanasonicMounterItemStatRoll({
        requestBody: {
          stat_item_id: statId,
          operator_id: operatorIdno,
          operation_time: new Date().toISOString(),
          slot_idno: slotIdno,
          sub_slot_idno: subSlotIdno,
          material_pack_code: materialPackCode,
          operation_type: "FEED" as never,
          feed_material_pack_type: "INSPECTION_MATERIAL_PACK" as never,
          check_pack_code_match: (checkPackCodeMatch ?? "MATCHED_MATERIAL_PACK") as never,
          unfeed_reason: null,
        },
      }).then(() => undefined),
    ...overrides,
  }
}
