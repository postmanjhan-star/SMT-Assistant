import { ref } from 'vue'
import type { FormInst, FormRules } from 'naive-ui'

export function useRollShortageForm() {
    const show = ref(false)
    const formRef = ref<FormInst | null>(null)

    const formValue = ref({
        materialInventoryIdno: '',
        slotIdno: '',
        type: '',
    })

    const rules: FormRules = {
        materialInventoryIdno: { required: true },
        slotIdno: { required: true },
        type: { required: true },
    }

    function open() {
        show.value = true
    }

    function close() {
        show.value = false
    }

    return {
        show,
        formRef,
        formValue,
        rules,
        open,
        close,
    }
}
