import { type Ref } from "vue"
import type { MaterialQueryRowModel } from "@/domain/mounter/MaterialQueryRowModel"
import { useMaterialQueryState } from "@/ui/shared/composables/useMaterialQueryState"
import { loadFujiMaterialQueryRows } from "@/application/fuji/material-query/FujiMaterialQueryUseCase"

export function useFujiMaterialQueryState(uuid: Ref<string>) {
  return useMaterialQueryState<MaterialQueryRowModel>(uuid, loadFujiMaterialQueryRows)
}
