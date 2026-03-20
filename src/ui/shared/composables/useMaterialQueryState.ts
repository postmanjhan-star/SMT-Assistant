import { ref, type Ref } from "vue"

export function useMaterialQueryState<TRow>(
  uuid: Ref<string>,
  loader: (uuid: string) => Promise<TRow[]>
): { rowData: Ref<TRow[]>; load: () => Promise<TRow[]> } {
  const rowData = ref<TRow[]>([]) as Ref<TRow[]>

  const load = async () => {
    const normalized = uuid.value?.toString().trim()
    if (!normalized) return rowData.value
    rowData.value = await loader(normalized)
    return rowData.value
  }

  return { rowData, load }
}
