export type SlotUploadDecision = {
  shouldUpload: boolean
  rows: any[] | null
}

export type SlotUploadSchedulerDeps = {
  checkShouldUpload: () => SlotUploadDecision
  onUpload: (rows: any[]) => Promise<void> | void
  delayMs?: number
}

// App: decides when to trigger auto-upload, no Vue, no UI
export class SlotUploadScheduler {
  private timer: ReturnType<typeof setTimeout> | null = null
  private delayMs: number

  constructor(private deps: SlotUploadSchedulerDeps) {
    this.delayMs = deps.delayMs ?? 300
  }

  schedule() {
    if (this.timer) clearTimeout(this.timer)

    this.timer = setTimeout(async () => {
      this.timer = null
      const { shouldUpload, rows } = this.deps.checkShouldUpload()
      if (!shouldUpload || !rows || rows.length === 0) return

      await this.deps.onUpload(rows)
    }, this.delayMs)
  }

  cancel() {
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
  }
}
