import type {
  PanasonicMounterFileRead,
  PanasonicMounterItemStatCreate,
  SmtMaterialInventory,
} from '@/client'
import type { FeedRecordPayload } from '@/domain/production/PostProductionFeedRecord'
import type { MaterialRepository } from '@/application/barcode-scan/BarcodeScanDeps'
import type { RecordApiPort } from '@/application/post-production-feed/RecordApiPort'
import type { PostProductionRecordUploader } from '@/application/post-production-feed/PostProductionRecordUploader'
import type {
  ProductionLifecycleUseCase,
  ProductionLifecycleDeps,
} from '@/application/preproduction/ProductionLifecycleUseCase'
import type {
  SubmitRollShortageUseCase,
  SubmitRollShortageUseCaseDeps,
} from '@/application/preproduction/SubmitRollShortageUseCase'
import type {
  SubmitSlotUseCase,
  SubmitSlotUseCaseDeps,
} from '@/application/preproduction/SubmitSlotUseCase'

// Application 層的 Smt Repository Port（取代對 @/infrastructure 的直接依賴）
export type SmtRepositoryPort = {
  fetchMaterialInventory(materialInventoryIdno: string): Promise<SmtMaterialInventory>
  addPanasonicMounterItemStatRoll(payload: FeedRecordPayload): Promise<unknown>
}

// Panasonic 前段上料的 fetch slots params（不依賴 @/infra 層型別）
export type PanasonicFetchSlotsParams = {
  workOrderIdno: string
  mounterIdno: string
  productIdno: string
  boardSide: string
  machineSide: string
  testingMode: boolean
  testingProductIdno?: string | null
}

export type PreproductionPanasonicDeps = {
  createSmtRepository: () => SmtRepositoryPort
  createSubmitSlotUseCase: (deps: SubmitSlotUseCaseDeps) => SubmitSlotUseCase
  createSubmitRollShortageUseCase: (deps: SubmitRollShortageUseCaseDeps) => SubmitRollShortageUseCase
  createProductionLifecycleUseCase: (deps: ProductionLifecycleDeps) => ProductionLifecycleUseCase
  now: () => string
  createMaterialRepository: () => MaterialRepository
  stopProduction: (uuid: string) => Promise<unknown>
  fetchSlots: (params: PanasonicFetchSlotsParams) => Promise<PanasonicMounterFileRead>
}

export type PostproductionPanasonicDeps = {
  createRecordApi: () => RecordApiPort
  createRecordUploader: (api: RecordApiPort) => PostProductionRecordUploader
  startPanasonicProduction: (payload: PanasonicMounterItemStatCreate[]) => Promise<unknown>
}
