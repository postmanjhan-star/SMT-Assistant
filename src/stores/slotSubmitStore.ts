import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'
import type {
  SlotSubmitDeps,
  SlotSubmitBindingPort,
  SlotSubmitGridPort,
} from '@/application/slot-submit/SlotSubmitDeps'
import { ApplySlotBindingUseCase } from '@/application/slot-submit/ApplySlotBindingUseCase'
import {
  CheckAutoUploadUseCase,
  type CheckAutoUploadResult,
} from '@/application/slot-submit/CheckAutoUploadUseCase'

export type SlotSubmitMode = 'normal' | 'testing'

export type SlotSubmitLastResult = {
  type: 'success' | 'warn' | 'error'
  message: string
}

export const useSlotSubmitStore = defineStore('slotSubmit', () => {
  const mode = ref<SlotSubmitMode>('normal')
  const isTestingMode = ref(false)
  const lastResult = ref<SlotSubmitLastResult | null>(null)
  const pendingAutoUpload = ref<any[] | null>(null)
  const deps = shallowRef<Partial<SlotSubmitDeps>>({})
  const checkAutoUseCase = new CheckAutoUploadUseCase()

  function setMode(next: SlotSubmitMode) {
    mode.value = next
    isTestingMode.value = next === 'testing'
  }

  function setTestingMode(value: boolean) {
    isTestingMode.value = value
    mode.value = value ? 'testing' : 'normal'
  }

  function setLastResult(result: SlotSubmitLastResult | null) {
    lastResult.value = result
  }

  function clearLastResult() {
    lastResult.value = null
  }

  function setPendingAutoUpload(rows: any[] | null) {
    pendingAutoUpload.value = rows
  }

  function clearPendingAutoUpload() {
    pendingAutoUpload.value = null
  }

  function bindDeps(newDeps: Partial<SlotSubmitDeps>) {
    const merged: Partial<SlotSubmitDeps> = {
      ...deps.value,
      ...newDeps,
    }

    if (newDeps.binding) {
      merged.binding = newDeps.binding
    } else if (newDeps.grid) {
      merged.binding = new ApplySlotBindingUseCase({
        grid: newDeps.grid,
      })
    }

    deps.value = merged
  }

  function getDeps() {
    return deps.value
  }

  function resolveBinding(): SlotSubmitBindingPort | null {
    return deps.value.binding ?? null
  }

  function resolveGrid(): SlotSubmitGridPort | null {
    return deps.value.grid ?? null
  }

  function hasRow(rowId: string): boolean {
    return resolveGrid()?.hasRow(rowId) ?? false
  }

  function applyMatch(
    slotIdno: string,
    material?: { idno?: string; remark?: string } | null,
    input?: { slot?: string; subSlot?: string | null }
  ): boolean {
    return resolveBinding()?.applyMatch(slotIdno, material, input) ?? false
  }

  function applyWarningBinding(
    slotIdno: string,
    material?: { idno?: string } | null,
    remark?: string
  ): boolean {
    return (
      resolveBinding()?.applyWarningBinding(slotIdno, material, remark) ?? false
    )
  }

  function applyMismatch(
    input: { slot: string; subSlot: string | null },
    expectedSlotIdno: string,
    materialIdno?: string
  ) {
    resolveBinding()?.applyMismatch(input, expectedSlotIdno, materialIdno)
  }

  function resetInputs() {
    deps.value.resetInputs?.()
  }

  function checkAutoUpload(): CheckAutoUploadResult {
    const grid = resolveGrid()
    if (!grid) {
      setPendingAutoUpload(null)
      return {
        allCorrect: false,
        invalidSlots: [],
        shouldAutoUpload: false,
        pendingRows: null,
      }
    }

    const result = checkAutoUseCase.execute({
      grid,
      isTestingMode: isTestingMode.value,
      mode: mode.value,
    })

    setPendingAutoUpload(result.pendingRows)
    if (result.shouldAutoUpload && result.message) {
      setLastResult({ type: 'success', message: result.message })
    }
    return result
  }

  return {
    mode,
    isTestingMode,
    lastResult,
    pendingAutoUpload,
    deps,
    bindDeps,
    getDeps,
    hasRow,
    applyMatch,
    applyWarningBinding,
    applyMismatch,
    resetInputs,
    checkAutoUpload,
    setMode,
    setTestingMode,
    setLastResult,
    clearLastResult,
    setPendingAutoUpload,
    clearPendingAutoUpload,
  }
})

export type SlotSubmitStore = ReturnType<typeof useSlotSubmitStore>
