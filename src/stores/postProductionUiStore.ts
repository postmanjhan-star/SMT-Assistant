import { defineStore } from "pinia"

export type PostProductionFeedUi = {
  success: (msg: string) => Promise<void> | Promise<boolean>
  warn: (msg: string) => boolean | void
  info?: (msg: string) => void
  error: (msg: string) => Promise<void> | Promise<boolean>
  notifyError: (msg: string) => void
  playErrorTone: () => Promise<void>
  resetSlotMaterialFormInputs: () => void
}

export const usePostProductionUiStore = defineStore("postProductionUi", () => {
  let ui: PostProductionFeedUi | null = null

  function bindUi(handlers: PostProductionFeedUi) {
    ui = handlers
  }

  async function success(msg: string): Promise<void> {
    await ui?.success?.(msg)
  }

  function warn(msg: string): boolean {
    const result = ui?.warn?.(msg)
    return typeof result === "boolean" ? result : false
  }

  function info(msg: string) {
    ui?.info?.(msg)
  }

  async function error(msg: string): Promise<void> {
    await ui?.error?.(msg)
  }

  function notifyError(msg: string) {
    ui?.notifyError?.(msg)
  }

  async function playErrorTone(): Promise<void> {
    await ui?.playErrorTone?.()
  }

  function resetSlotMaterialFormInputs() {
    ui?.resetSlotMaterialFormInputs?.()
  }

  return {
    bindUi,
    success,
    warn,
    info,
    error,
    notifyError,
    playErrorTone,
    resetSlotMaterialFormInputs,
  }
})

export type PostProductionUiStore = ReturnType<typeof usePostProductionUiStore>
