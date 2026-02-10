import { ref, type Ref } from "vue"
import { loadPanasonicMaterialQueryRows } from "@/application/panasonic/material-query/PanasonicMaterialQueryUseCase"
import type { PanasonicMaterialQueryRowModel } from "@/domain/material/buildPanasonicMaterialQueryRows"

export function usePanasonicMaterialQuery(uuid: Ref<string>) {
    const rowData = ref<PanasonicMaterialQueryRowModel[]>([])

    const load = async () => {
        const normalized = uuid.value?.toString().trim()
        if (!normalized) {
            return rowData.value
        }

        const rows = await loadPanasonicMaterialQueryRows(normalized)
        rowData.value = rows
        return rows
    }

    return { rowData, load }
}
