import { defineStore } from "pinia"
import { ref } from "vue"

export type PostProductionRollShortageFormValue = {
  materialInventoryIdno: string
  slotIdno: string
  type: string
}

export const usePostProductionModalStore = defineStore(
  "postProductionModal",
  () => {
    const showRollShortageModal = ref(false)
    const rollShortageFormValue = ref<PostProductionRollShortageFormValue>({
      materialInventoryIdno: "",
      slotIdno: "",
      type: "",
    })

    function openRollShortageModal() {
      showRollShortageModal.value = true
    }

    function closeRollShortageModal() {
      showRollShortageModal.value = false
    }

    function resetRollShortageForm() {
      rollShortageFormValue.value = {
        materialInventoryIdno: "",
        slotIdno: "",
        type: "",
      }
    }

    return {
      showRollShortageModal,
      rollShortageFormValue,
      openRollShortageModal,
      closeRollShortageModal,
      resetRollShortageForm,
    }
  }
)

export type PostProductionModalStore = ReturnType<
  typeof usePostProductionModalStore
>
