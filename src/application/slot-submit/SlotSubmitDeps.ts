import { SlotSubmitFeedGridAdapter } from "@/ui/slot-submit/SlotSubmitFeedGridAdapter";


export interface UiFeedback {
    success(msg: string): Promise<void>
    warn(msg: string): Promise<void>
    error(msg: string): Promise<void>
}

export type SlotSubmitDeps = {
    grid: SlotSubmitFeedGridAdapter
    ui: UiFeedback
    isTestingMode: boolean
    autoUpload: (rows: any[]) => void
    resetInputs: () => void
}
