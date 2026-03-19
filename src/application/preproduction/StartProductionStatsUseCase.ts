export type StartProductionStatsResult = {
  productionUuid: string
  statItemMap: Map<string, number> // slotKey → stat.id
}

export type StartProductionStatsDeps<TRow, TUnload, TSplice, TIpqc = unknown> = {
  startProduction: (rows: TRow[]) => Promise<StartProductionStatsResult>
  uploadUnload: (record: TUnload, statItemMap: Map<string, number>) => Promise<void>
  uploadSplice: (record: TSplice, statItemMap: Map<string, number>) => Promise<void>
  uploadIpqc?: (record: TIpqc, statItemMap: Map<string, number>) => Promise<void>
}

export type StartProductionStatsInput<TRow, TUnload, TSplice, TIpqc = unknown> = {
  rowData: TRow[]
  pendingUnloadRecords: TUnload[]
  pendingSpliceRecords: TSplice[]
  pendingIpqcRecords?: TIpqc[]
  onUnloadUploaded?: (ok: boolean) => void
  onIpqcUploaded?: (ok: boolean) => void
}

export class StartProductionStatsUseCase<TRow, TUnload, TSplice, TIpqc = unknown> {
  constructor(private deps: StartProductionStatsDeps<TRow, TUnload, TSplice, TIpqc>) {}

  async execute(input: StartProductionStatsInput<TRow, TUnload, TSplice, TIpqc>): Promise<string> {
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

    if (input.pendingIpqcRecords && input.pendingIpqcRecords.length > 0 && this.deps.uploadIpqc) {
      const results = await Promise.allSettled(
        input.pendingIpqcRecords.map((r) => this.deps.uploadIpqc!(r, statItemMap))
      )
      input.onIpqcUploaded?.(results.every((r) => r.status === "fulfilled"))
    }

    return productionUuid
  }
}
