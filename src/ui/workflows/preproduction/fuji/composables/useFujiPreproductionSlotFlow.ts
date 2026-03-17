import { computed, ref, type Ref, type ShallowRef } from "vue"
import type { SmtMaterialInventory } from "@/client"
import { useUiNotifier } from "@/ui/shared/composables/useUiNotifier"
import { SlotSubmissionRunner } from "@/application/slot-submit/SlotSubmissionRunner"
import { NormalModeStrategy } from "@/application/slot-submit/NormalModeStrategy"
import { TestingModeStrategy } from "@/application/slot-submit/TestingModeStrategy"
import { MockNormalModeStrategy } from "@/application/slot-submit/MockNormalModeStrategy"
import type { SlotSubmitStoreLike } from "@/application/slot-submit/SlotSubmitDeps"
import { SimpleBarcodeValidator } from "@/domain/material/BarcodeValidator"
import { BarcodeScanUseCase } from "@/application/barcode-scan/BarcodeScanUseCase"
import { ApiMaterialRepository } from "@/infra/material/ApiMaterialRepository"
import { findAvailableMaterialRows } from "@/domain/material/FujiMaterialMatchRules"
import { parseFujiSlotIdno } from "@/domain/slot/FujiSlotParser"
import type { FujiMounterGridAdapter } from "@/ui/workflows/preproduction/fuji/FujiMounterGridAdapter"
import type { FujiMounterRowModel } from "@/ui/workflows/preproduction/fuji/composables/useFujiProductionState"

export type UseFujiPreproductionSlotFlowOptions = {
  rowData: Ref<FujiMounterRowModel[]>
  isTestingMode: Ref<boolean>
  isMockMode?: boolean
  gridAdapter: ShallowRef<FujiMounterGridAdapter<FujiMounterRowModel> | null>
  focusSlotInput?: () => void
  onAfterSuccess?: () => void | Promise<void>
}

export function useFujiPreproductionSlotFlow(options: UseFujiPreproductionSlotFlowOptions) {
  const { success: showSuccess, warn: showWarn, error: showError } = useUiNotifier()

  const materialInventory = ref<SmtMaterialInventory | null>(null)
  const materialResetKey = ref(0)

  const getMaterialMatchedRows = (materialIdno: string) =>
    findAvailableMaterialRows(options.rowData.value, materialIdno)

  const materialScanUseCase = computed(
    () =>
      new BarcodeScanUseCase<FujiMounterRowModel>({
        validator: new SimpleBarcodeValidator(),
        materialRepository: new ApiMaterialRepository(),
        isTestingMode: options.isTestingMode.value,
        getMaterialMatchedRows,
      })
  )

  const scanMaterial = (barcode: string) => materialScanUseCase.value.execute(barcode)

  function resetMaterialState() {
    materialInventory.value = null
    materialResetKey.value += 1
  }

  function handleMaterialMatched(payload: { materialInventory: SmtMaterialInventory }) {
    materialInventory.value = payload.materialInventory
    options.focusSlotInput?.()
  }

  function handleMaterialError(msg: string) {
    materialInventory.value = null
    showError(msg)
  }

  const findRowByParsedSlot = (parsed: {
    machineIdno: string
    stage: string
    slot: number
  }) =>
    options.rowData.value.find(
      (row) =>
        row.mounterIdno === parsed.machineIdno &&
        row.stage === parsed.stage &&
        row.slot === parsed.slot
    )

  const slotSubmitStore: SlotSubmitStoreLike = {
    setLastResult(result) {
      if (!result) return
      if (result.type === "success") return showSuccess(result.message)
      if (result.type === "warn") return showWarn(result.message)
      return showError(result.message)
    },
    resetInputs() {
      resetMaterialState()
    },
    hasRow(rowId: string): boolean {
      const parsed = parseFujiSlotIdno(rowId)
      if (!parsed) return false
      return !!findRowByParsedSlot(parsed)
    },
    applyMatch(
      correctSlotIdno: string,
      materialInfo?: { idno?: string; remark?: string } | null,
      _input?: { slot?: string; subSlot?: string | null }
    ): boolean {
      const parsed = parseFujiSlotIdno(correctSlotIdno)
      if (!parsed) return false
      const adapter = options.gridAdapter.value
      if (!adapter) return false
      const row = findRowByParsedSlot(parsed)
      if (!row) return false

      adapter.clearErrorMaterialInventory(materialInfo?.idno ?? "", {
        mounterIdno: parsed.machineIdno,
        stage: parsed.stage,
        slot: parsed.slot,
      })
      adapter.markMatched(row, materialInfo?.idno ?? "")
      if (materialInfo?.remark) {
        row.remark = materialInfo.remark
      }

      return true
    },
    applyWarningBinding(
      slotIdno: string,
      materialInfo?: { idno?: string } | null,
      _remark?: string
    ): boolean {
      const parsed = parseFujiSlotIdno(slotIdno)
      if (!parsed) return false
      const adapter = options.gridAdapter.value
      if (!adapter) return false
      const row = findRowByParsedSlot(parsed)
      if (!row) return false

      adapter.markTesting(row, materialInfo?.idno ?? "")
      return true
    },
    applyMismatch(
      inputSlot: { slot: string; subSlot: string | null },
      _expectedSlotIdno: string,
      materialIdno?: string
    ) {
      const slotKey = `${inputSlot.slot}-${inputSlot.subSlot ?? ""}`
      const parsed = parseFujiSlotIdno(slotKey)
      if (!parsed) return
      const adapter = options.gridAdapter.value
      if (!adapter) return
      const row = findRowByParsedSlot(parsed)
      if (!row) return

      adapter.markUnmatched(row, materialIdno ?? "")
    },
  }

  const slotSubmitStrategy = computed(() => {
    if (options.isMockMode && !options.isTestingMode.value) {
      return new MockNormalModeStrategy({ store: slotSubmitStore })
    }
    return options.isTestingMode.value
      ? new TestingModeStrategy({ store: slotSubmitStore })
      : new NormalModeStrategy({ store: slotSubmitStore })
  })

  const { handleSlotSubmit } = SlotSubmissionRunner({
    submit: async (payload) => {
      const trimmed = payload.slotIdno.trim()
      if (!trimmed) {
        await showWarn("請輸入槽位")
        return false
      }

      if (!payload.slot) {
        await showError("槽位格式錯誤")
        return false
      }

      const slot = payload.slot
      const subSlot = payload.subSlot
      const result = materialInventory.value
        ? {
            success: true,
            materialInventory: materialInventory.value,
            matchedRows: findAvailableMaterialRows(
              options.rowData.value,
              materialInventory.value.material_idno
            ).map((row) => ({
              slotIdno: `${row.mounterIdno}-${row.stage}`,
              subSlotIdno: String(row.slot),
            })),
          }
        : null

      return slotSubmitStrategy.value.submit({
        result,
        slot,
        subSlot,
        slotIdno: `${slot}-${subSlot}`,
      })
    },
    afterSuccess: async () => {
      resetMaterialState()
      await options.onAfterSuccess?.()
    },
  })

  return {
    materialInventory,
    materialResetKey,
    getMaterialMatchedRows,
    scanMaterial,
    handleMaterialMatched,
    handleMaterialError,
    resetMaterialState,
    handleSlotSubmit,
    showError,
  }
}
