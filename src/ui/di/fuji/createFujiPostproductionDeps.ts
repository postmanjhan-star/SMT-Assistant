import { FujiPostProductionRecordApi } from '@/infra/post-production/FujiPostProductionRecordApi'
import { FujiPostProductionRecordUploader } from '@/application/post-production-feed/FujiPostProductionRecordUploader'
import type { FujiRecordApiPort } from '@/application/post-production-feed/FujiRecordApiPort'

export type FujiPostproductionDeps = {
  createUploader: () => FujiPostProductionRecordUploader
}

export function createFujiPostproductionDeps(
  overrides: Partial<FujiPostproductionDeps> = {}
): FujiPostproductionDeps {
  return {
    createUploader: () => {
      const api: FujiRecordApiPort = new FujiPostProductionRecordApi()
      return new FujiPostProductionRecordUploader(api)
    },
    ...overrides,
  }
}
