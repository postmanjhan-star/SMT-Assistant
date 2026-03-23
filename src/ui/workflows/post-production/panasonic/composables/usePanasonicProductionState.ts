/* eslint-disable no-restricted-imports -- [Phase-1 whitelist] tracked in REFACTORING_BASELINE.md, fix in Phase 3 */
import { ref, type Ref } from "vue"
import {
    loadPanasonicProduction,
    type PanasonicProductionLoadResult,
} from "@/application/panasonic/post-production-load/ProductionLoadUseCase"
import type { PanasonicMounterItemStatRead } from "@/client"
import type { ProductionRowModel } from "@/domain/production/buildPanasonicRowData"

export function usePanasonicProductionState(productionUuid: Ref<string>) {
    const mounterData = ref<PanasonicMounterItemStatRead[]>([])
    const rowData = ref<ProductionRowModel[]>([])
    const productionStarted = ref(false)

    const load = async (): Promise<PanasonicProductionLoadResult> => {
        const result = await loadPanasonicProduction(productionUuid.value)

        mounterData.value = result.mounterData
        rowData.value = result.rowData
        productionStarted.value = result.productionStarted

        return result
    }

    return { mounterData, rowData, productionStarted, load }
}
