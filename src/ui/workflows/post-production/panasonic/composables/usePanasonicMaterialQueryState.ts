import { type Ref } from "vue"
import { loadPanasonicMaterialQueryRows } from "@/application/panasonic/material-query/PanasonicMaterialQueryUseCase"
import type { PanasonicMaterialQueryRowModel } from "@/domain/material/buildPanasonicMaterialQueryRows"
import { useMaterialQueryState } from "@/ui/shared/composables/useMaterialQueryState"

export function usePanasonicMaterialQueryState(uuid: Ref<string>) {
  return useMaterialQueryState<PanasonicMaterialQueryRowModel>(uuid, loadPanasonicMaterialQueryRows)
}
