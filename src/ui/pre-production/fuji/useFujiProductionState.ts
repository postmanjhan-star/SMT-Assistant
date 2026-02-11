import { ref } from 'vue'
import type { FujiMounterFileRead } from '@/client'
import { FujiProductionRowBuilder, type FujiProductionRow } from '@/domain/production/FujiProductionRowBuilder'

export function useFujiProductionState() {
  const rows = ref<FujiProductionRow[]>([])

  function setFromApi(data: FujiMounterFileRead[]) {
    rows.value = FujiProductionRowBuilder.build(data)
  }

  return { rows, setFromApi }
}

export type FujiMounterRowModel = FujiProductionRow
