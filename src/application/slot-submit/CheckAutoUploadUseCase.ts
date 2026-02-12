import { shouldAutoUpload } from '@/domain/slot/SlotBindingRules'

export type CheckAutoUploadInput = {
  grid: {
    checkAllCorrect: () => { allCorrect: boolean; invalidSlots: string[] }
    getAllRowsData: () => any[]
  }
  isTestingMode: boolean
  mode: 'normal' | 'testing'
}

export type CheckAutoUploadResult = {
  allCorrect: boolean
  invalidSlots: string[]
  shouldAutoUpload: boolean
  pendingRows: any[] | null
  message?: string
}

export class CheckAutoUploadUseCase {
  execute(input: CheckAutoUploadInput): CheckAutoUploadResult {
    const { allCorrect, invalidSlots } = input.grid.checkAllCorrect()
    const shouldUpload = shouldAutoUpload({
      allCorrect,
      isTestingMode: input.isTestingMode,
    })
    return {
      allCorrect,
      invalidSlots,
      shouldAutoUpload: shouldUpload,
      pendingRows: shouldUpload ? input.grid.getAllRowsData() : null,
      message: shouldUpload ? '全部槽位綁定完成，準備自動上傳' : undefined,
    }
  }
}
