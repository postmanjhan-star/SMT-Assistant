import { ref } from 'vue'
import type { CheckMaterialMatchEnum, FujiMounterFileRead } from '@/client'

export type FujiMounterRowModel = {
    correct: CheckMaterialMatchEnum | null
    id: number
    mounterIdno: string
    boardSide: string
    stage: string
    slot: number
    materialIdno: string
    operatorIdno: string | null
    materialInventoryIdno: string | null
    remark?: string
}

const normalizeStage = (stage: string) => {
    if (stage === '1') return 'A'
    if (stage === '2') return 'B'
    if (stage === '3') return 'C'
    if (stage === '4') return 'D'
    return stage
}

export const buildFujiMounterRows = (
    data: FujiMounterFileRead[]
): FujiMounterRowModel[] => {
    const rows: FujiMounterRowModel[] = []
    data.forEach(masterData => {
        masterData.fuji_mounter_file_items.forEach(detailData => {
            rows.push({
                id: detailData.id,
                mounterIdno: masterData.mounter_idno,
                boardSide: masterData.board_side,
                stage: normalizeStage(String(detailData.stage)),
                slot: detailData.slot,
                operatorIdno: null,
                materialIdno: detailData.part_number,
                materialInventoryIdno: null,
                correct: null,
            })
        })
    })
    return rows
}

export function useFujiProductionState() {
    const rows = ref<FujiMounterRowModel[]>([])

    function setFromApi(data: FujiMounterFileRead[]) {
        rows.value = buildFujiMounterRows(data)
    }

    return { rows, setFromApi }
}
