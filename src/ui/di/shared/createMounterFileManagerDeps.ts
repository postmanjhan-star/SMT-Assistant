import { SmtService } from "@/client"
import type {
  PanasonicMounterFileRead,
  FujiMounterFileRead,
  PanasonicMounterFileItemRead,
  FujiMounterFileItemRead,
} from "@/client"

export type MounterFileManagerDeps = {
  getPanasonicFileList: () => Promise<PanasonicMounterFileRead[]>
  getFujiFileList: () => Promise<FujiMounterFileRead[]>
  deletePanasonicFile: (id: number) => Promise<unknown>
  deleteFujiFile: (id: number) => Promise<unknown>
  getPanasonicFileItemList: (id: number) => Promise<PanasonicMounterFileItemRead[]>
  getFujiFileItemList: (id: number) => Promise<FujiMounterFileItemRead[]>
}

export function createMounterFileManagerDeps(
  overrides: Partial<MounterFileManagerDeps> = {}
): MounterFileManagerDeps {
  return {
    getPanasonicFileList: () => SmtService.getPanasonicMounterFileList({}),
    getFujiFileList: () => SmtService.getFujiMounterFileList({}),
    deletePanasonicFile: (id) => SmtService.deletePanasonicMounterFile({ id }),
    deleteFujiFile: (id) => SmtService.deleteFujiMounterFile({ id }),
    getPanasonicFileItemList: (id) => SmtService.getPanasonicMounterFileItemList({ id }),
    getFujiFileItemList: (id) => SmtService.getFujiMounterFileItemList({ id }),
    ...overrides,
  }
}
