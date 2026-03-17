export type StartProductionStatsResult = {
  productionUuid: string
  statItemMap: Map<string, number> // slotKey → stat.id
}

export type StartProductionStatsDeps<TRow, TUnload, TSplice> = {
  startProduction: (rows: TRow[]) => Promise<StartProductionStatsResult>
  uploadUnload: (record: TUnload, statItemMap: Map<string, number>) => Promise<void>
  uploadSplice: (record: TSplice, statItemMap: Map<string, number>) => Promise<void>
}

export type StartProductionStatsInput<TRow, TUnload, TSplice> = {
  rowData: TRow[]
  pendingUnloadRecords: TUnload[]
  pendingSpliceRecords: TSplice[]
  onUnloadUploaded?: (ok: boolean) => void
}

export class StartProductionStatsUseCase<TRow, TUnload, TSplice> {
  constructor(private deps: StartProductionStatsDeps<TRow, TUnload, TSplice>) {}

  async execute(input: StartProductionStatsInput<TRow, TUnload, TSplice>): Promise<string> {
    const { productionUuid, statItemMap } = await this.deps.startProduction(input.rowData)

    if (input.pendingUnloadRecords.length > 0) {
      const results = await Promise.allSettled(
        input.pendingUnloadRecords.map((r) => this.deps.uploadUnload(r, statItemMap))
      )
      input.onUnloadUploaded?.(results.every((r) => r.status === "fulfilled"))
    }

    if (input.pendingSpliceRecords.length > 0) {
      await Promise.allSettled(
        input.pendingSpliceRecords.map((r) => this.deps.uploadSplice(r, statItemMap))
      )
    }

    return productionUuid
  }
}
