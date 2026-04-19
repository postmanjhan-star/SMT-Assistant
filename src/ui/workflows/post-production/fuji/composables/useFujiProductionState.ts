import { ref, type Ref } from "vue"
import type {
  FujiItemStatFeedLogRead,
  FujiMounterItemStatRead,
} from "@/application/preproduction/clientTypes"
import type { StatLike } from "@/domain/production/PostProductionFeedRules"
import {
  buildFujiInspectionStats,
  buildFujiProductionRowData,
  type FujiProductionRowModel,
} from "@/domain/production/buildFujiProductionRowData"

export interface FujiProductionStateSource {
  fetchProductionStats(uuid: string): Promise<FujiMounterItemStatRead[]>
  fetchFeedLogs(uuid: string): Promise<FujiItemStatFeedLogRead[]>
}

export interface FujiProductionLoadResult {
  mounterData: FujiMounterItemStatRead[]
  inspectionStats: StatLike[]
  rowData: FujiProductionRowModel[]
  productionStarted: boolean
  firstStat: FujiMounterItemStatRead | undefined
}

export function useFujiProductionState(
  productionUuid: Ref<string>,
  source: FujiProductionStateSource,
) {
  const mounterData = ref<FujiMounterItemStatRead[]>([])
  const inspectionStats = ref<StatLike[]>([])
  const rowData = ref<FujiProductionRowModel[]>([])
  const productionStarted = ref(false)

  async function load(): Promise<FujiProductionLoadResult> {
    const stats = await source.fetchProductionStats(productionUuid.value)
    mounterData.value = stats
    productionStarted.value = stats.length > 0 ? !stats[0].production_end : false

    let logs: FujiItemStatFeedLogRead[] = []
    try {
      logs = await source.fetchFeedLogs(productionUuid.value)
    } catch (error) {
      console.error("Failed to fetch logs", error)
    }

    inspectionStats.value = buildFujiInspectionStats(logs, stats)
    rowData.value = buildFujiProductionRowData(stats, logs)

    return {
      mounterData: stats,
      inspectionStats: inspectionStats.value,
      rowData: rowData.value,
      productionStarted: productionStarted.value,
      firstStat: stats[0],
    }
  }

  return { mounterData, inspectionStats, rowData, productionStarted, load }
}
