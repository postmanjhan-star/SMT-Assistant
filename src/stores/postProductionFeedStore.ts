import { defineStore } from "pinia"
import { computed } from "vue"
import {
  usePostProductionStateStore,
  type PostProductionCorrectState,
  type PostProductionMaterialInventory,
  type PostProductionMaterialResult,
} from "@/stores/postProductionStateStore"
import {
  usePostProductionUiStore,
  type PostProductionFeedUi,
} from "@/stores/postProductionUiStore"
import {
  usePostProductionGridStore,
  type PostProductionGridPort,
} from "@/stores/postProductionGridStore"
import {
  usePostProductionModalStore,
  type PostProductionRollShortageFormValue,
} from "@/stores/postProductionModalStore"

// Migration guide:
// - State: usePostProductionStateStore
// - UI handlers: usePostProductionUiStore
// - Grid integration: usePostProductionGridStore
// - Modal control: usePostProductionModalStore
// - Facade (compat): usePostProductionFeedStore

export type {
  PostProductionCorrectState,
  PostProductionMaterialInventory,
  PostProductionMaterialResult,
} from "@/stores/postProductionStateStore"
export type { PostProductionFeedUi } from "@/stores/postProductionUiStore"
export type { PostProductionGridPort } from "@/stores/postProductionGridStore"
export type { PostProductionRollShortageFormValue } from "@/stores/postProductionModalStore"

export const usePostProductionFeedStore = defineStore(
  "postProductionFeed",
  () => {
    const stateStore = usePostProductionStateStore()
    const uiStore = usePostProductionUiStore()
    const gridStore = usePostProductionGridStore()
    const modalStore = usePostProductionModalStore()

    const correctState = computed({
      get: () => stateStore.correctState,
      set: (value: PostProductionCorrectState) => {
        stateStore.setCorrectState(value)
      },
    })

    const materialResult = computed({
      get: () => stateStore.materialResult,
      set: (value: PostProductionMaterialResult | null) => {
        stateStore.setMaterialResult(value)
      },
    })

    const showRollShortageModal = computed({
      get: () => modalStore.showRollShortageModal,
      set: (value: boolean) => {
        if (value) {
          modalStore.openRollShortageModal()
          return
        }
        modalStore.closeRollShortageModal()
      },
    })

    const rollShortageFormValue = computed({
      get: () => modalStore.rollShortageFormValue,
      set: (value: PostProductionRollShortageFormValue) => {
        modalStore.rollShortageFormValue = value
      },
    })

    return {
      correctState,
      materialResult,
      setMaterialResult: stateStore.setMaterialResult,
      clearMaterialResult: stateStore.clearMaterialResult,
      setCorrectState: stateStore.setCorrectState,
      getCorrectState: stateStore.getCorrectState,

      bindUi: uiStore.bindUi,
      success: uiStore.success,
      warn: uiStore.warn,
      info: uiStore.info,
      error: uiStore.error,
      notifyError: uiStore.notifyError,
      playErrorTone: uiStore.playErrorTone,
      resetSlotMaterialFormInputs: uiStore.resetSlotMaterialFormInputs,

      bindGrid: gridStore.bindGrid,
      getRowNode: gridStore.getRowNode,
      getRow: gridStore.getRow,
      getRowId: gridStore.getRowId,
      deselectRow: gridStore.deselectRow,
      cleanErrorMaterialInventory: gridStore.cleanErrorMaterialInventory,
      applyInspectionUpdate: gridStore.applyInspectionUpdate,
      setAppendedMaterialInventoryIdno:
        gridStore.setAppendedMaterialInventoryIdno,

      showRollShortageModal,
      rollShortageFormValue,
      openRollShortageModal: modalStore.openRollShortageModal,
      closeRollShortageModal: modalStore.closeRollShortageModal,
      resetRollShortageForm: modalStore.resetRollShortageForm,
    }
  }
)

export type PostProductionFeedStore = ReturnType<
  typeof usePostProductionFeedStore
>
