import { ref, type Ref } from "vue"
import {
    loadPanasonicProduction,
    type PanasonicProductionLoadResult,
} from "@/application/post-production-load/ProductionLoadUseCase"
import type { PanasonicMounterItemStatRead } from "@/client"
import type { ProductionRowModel } from "@/domain/production/buildPanasonicRowData"

export function usePanasonicProductionLoader(productionUuid: Ref<string>) {
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
