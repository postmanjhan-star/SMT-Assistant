export type SlotFormValue = {
    slotIdno: string
    materialInventoryIdno: string
    remark: string
}

export type MaterialFormValue = {
    materialInventoryIdno: string
}

export type SlotInputReset = {
    slotForm: SlotFormValue
    materialForm: MaterialFormValue
}

export const SlotInputPolicy = {
    clearAfterSuccessfulBinding(): SlotInputReset {
        return {
            slotForm: {
                slotIdno: "",
                materialInventoryIdno: "",
                remark: "",
            },
            materialForm: {
                materialInventoryIdno: "",
            },
        }
    },
}
