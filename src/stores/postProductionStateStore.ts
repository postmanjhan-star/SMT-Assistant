import { defineStore } from "pinia"
import { ref } from "vue"

export type PostProductionCorrectState = "true" | "false" | "warning"

export type PostProductionMaterialInventory = {
  idno: string
  remark?: string
}

export type PostProductionMaterialResult = {
  success: boolean
  materialInventory?: PostProductionMaterialInventory | null
  matchedRows?: Array<{
    slotIdno: string
    subSlotIdno?: string | null
  }>
}

export const usePostProductionStateStore = defineStore(
  "postProductionState",
  () => {
    const correctState = ref<PostProductionCorrectState>("false")
    const materialResult = ref<PostProductionMaterialResult | null>(null)

    function setMaterialResult(result: PostProductionMaterialResult | null) {
      materialResult.value = result
    }

    function clearMaterialResult() {
      materialResult.value = null
    }

    function setCorrectState(state: PostProductionCorrectState) {
      correctState.value = state
    }

    function getCorrectState() {
      return correctState.value
    }

    return {
      correctState,
      materialResult,
      setMaterialResult,
      clearMaterialResult,
      setCorrectState,
      getCorrectState,
    }
  }
)

export type PostProductionStateStore = ReturnType<
  typeof usePostProductionStateStore
>
