export type CorrectState = "true" | "false" | "warning"

export type RowModelBase = {
    slotIdno: string
    subSlotIdno: string
    appendedMaterialInventoryIdno?: string | null
    operatorIdno?: string | null
    inspectMaterialPackCode?: string
    inspectTime?: string | null
    inspectCount?: number | null
    remark?: string
}
