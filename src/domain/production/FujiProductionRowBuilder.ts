import type { CheckMaterialMatchEnum, FujiMounterFileRead } from '@/client'

export type FujiProductionRow = {
  correct: CheckMaterialMatchEnum | null
  id: number
  mounterIdno: string
  boardSide: string
  stage: string
  slot: number
  materialIdno: string
  operatorIdno: string | null
  materialInventoryIdno: string | null
  appendedMaterialInventoryIdno?: string
  remark?: string
}

const normalizeStage = (stage: string) => {
  if (stage === '1') return 'A'
  if (stage === '2') return 'B'
  if (stage === '3') return 'C'
  if (stage === '4') return 'D'
  return stage
}

// Domain: normalize stage & build Fuji rows
export class FujiProductionRowBuilder {
  static build(data: FujiMounterFileRead[]): FujiProductionRow[] {
    const rows: FujiProductionRow[] = []
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
}
