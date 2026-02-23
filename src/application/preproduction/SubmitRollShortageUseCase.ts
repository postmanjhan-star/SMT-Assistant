import {
  SubmitPanasonicRollShortageUseCase,
  type PanasonicRollShortageError,
  type PanasonicRollShortageInfo,
  type PanasonicRollShortageInput,
  type PanasonicRollShortageResult,
  type PanasonicRollShortageUpdate,
} from "@/application/panasonic/roll-shortage/SubmitPanasonicRollShortageUseCase"
import { RollShortagePolicy } from "@/domain/preproduction/RollShortagePolicy"
import { MaterialMatchingPolicy } from "@/domain/preproduction/MaterialMatchingPolicy"
import type { ProductionRowModel } from "@/pages/mounter/panasonic/types/production"
import type { SmtProductionRepository } from "@/infrastructure/repositories/SmtProductionRepository"

export type SubmitRollShortageInput = PanasonicRollShortageInput
export type SubmitRollShortageError = PanasonicRollShortageError
export type SubmitRollShortageInfo = PanasonicRollShortageInfo
export type SubmitRollShortageUpdate = PanasonicRollShortageUpdate<ProductionRowModel>
export type SubmitRollShortageResult = PanasonicRollShortageResult<ProductionRowModel>

export type SubmitRollShortageUseCaseDeps = {
  repository: SmtProductionRepository
  getRowData: () => ProductionRowModel[]
  getStatBySlotIdno: (slotIdno: string) => { id: number } | null
  isTestingMode: () => boolean
  operatorId: () => string | null
  now: () => string
}

export class SubmitRollShortageUseCase {
  private useCase: SubmitPanasonicRollShortageUseCase<ProductionRowModel>

  constructor(private deps: SubmitRollShortageUseCaseDeps) {
    this.useCase = new SubmitPanasonicRollShortageUseCase<ProductionRowModel>({
      getRowData: () => this.deps.getRowData(),
      getStatBySlotIdno: (slotIdno) => this.deps.getStatBySlotIdno(slotIdno),
      fetchMaterialInventory: (materialInventoryIdno) =>
        this.deps.repository.fetchMaterialInventory(materialInventoryIdno),
      uploadRollRecord: (input) => {
        const payload = RollShortagePolicy.buildPanasonicFeedRecord({
          statId: input.statId,
          operatorId: input.operatorId,
          operationTime: input.operationTime,
          slotIdno: input.slotIdno,
          subSlotIdno: input.subSlotIdno ?? null,
          materialPackCode: input.materialPackCode,
          feedMaterialPackType: input.feedMaterialPackType,
          checkPackCodeMatch: input.checkPackCodeMatch,
        })

        return this.deps.repository.addPanasonicMounterItemStatRoll(payload)
      },
      isTestingMode: () => this.deps.isTestingMode(),
      operatorId: () => this.deps.operatorId(),
      now: () => this.deps.now(),
      matchRowsByMaterialIdno: (rows, materialIdno) =>
        MaterialMatchingPolicy.filterUnboundRows(rows, materialIdno),
      resolveRowId: (row) => `${row.slotIdno}-${row.subSlotIdno ?? ""}`,
    })
  }

  async execute(
    input: SubmitRollShortageInput
  ): Promise<SubmitRollShortageResult> {
    return this.useCase.execute(input)
  }
}
