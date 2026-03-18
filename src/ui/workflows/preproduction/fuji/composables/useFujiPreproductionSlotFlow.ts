import { computed, ref, watch, type Ref, type ShallowRef } from "vue"
import type { SmtMaterialInventory } from "@/client"
import { useUiNotifier } from "@/ui/shared/composables/useUiNotifier"
import { SlotSubmissionRunner } from "@/application/slot-submit/SlotSubmissionRunner"
import { createSlotSubmitStrategy } from "@/application/slot-submit/createSlotSubmitStrategy"
import { useSlotSubmitStore } from "@/stores/slotSubmitStore"
import { SimpleBarcodeValidator } from "@/domain/material/BarcodeValidator"
import { BarcodeScanUseCase } from "@/application/barcode-scan/BarcodeScanUseCase"
import { ApiMaterialRepository } from "@/infra/material/ApiMaterialRepository"
import { findAvailableMaterialRows } from "@/domain/material/FujiMaterialMatchRules"
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
  const { warn: showWarn, error: showError } = useUiNotifier()

  const store = useSlotSubmitStore()
  store.setTestingMode(options.isTestingMode.value)
  watch(options.isTestingMode, val => store.setTestingMode(val))

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

  watch(
    options.gridAdapter,
    adapter => {
      if (adapter) store.bindDeps({ grid: adapter, resetInputs: resetMaterialState })
    },
    { immediate: true }
  )

  function handleMaterialMatched(payload: { materialInventory: SmtMaterialInventory }) {
    materialInventory.value = payload.materialInventory
    options.focusSlotInput?.()
  }

  function handleMaterialError(msg: string) {
    materialInventory.value = null
    showError(msg)
  }

  const { handleSlotSubmit } = SlotSubmissionRunner({
    submit: async (payload) => {
      const trimmed = payload.slotIdno.trim()
      if (!trimmed) {
        await showWarn("請輸入槽位")
        return false
      }

      if (!payload.slot) {
        showError("槽位格式錯誤")
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

      const storeDeps = store.getDeps() ?? {}
      const strategy = createSlotSubmitStrategy(
        options.isTestingMode.value,
        options.isMockMode,
        { ...storeDeps, store }
      )
      return strategy.submit({
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
