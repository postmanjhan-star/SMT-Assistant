<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { NForm, NFormItem, NInput, InputInst } from 'naive-ui'

const props = defineProps<{
    isTestingMode: boolean
    hasMaterial: boolean
    disabled?: boolean
    resetKey?: number
    inputTestId?: string
    parseSlotIdno?: (raw: string) => { slot: string; subSlot: string } | null
    beforeSubmit?: (raw: string) => boolean | Promise<boolean>
    modelValue?: string
}>()

const emit = defineEmits<{
    (e: 'submit', payload: {
        slotIdno: string
        slot: string
        subSlot: string
    }): void
    (e: 'done'): void
    (e: 'error', msg: string): void
    (e: 'update:modelValue', value: string): void
}>()

const slotIdnoInput = ref<InputInst | null>(null)
const formValue = ref({
    slotIdno: ''
})

const inputValue = computed({
    get: () => (props.modelValue !== undefined ? props.modelValue : formValue.value.slotIdno),
    set: (value: string) => {
        if (props.modelValue !== undefined) {
            emit('update:modelValue', value)
            return
        }
        formValue.value.slotIdno = value
    }
})

watch(
    () => props.hasMaterial,
    (val, prev) => {
        if (val) {
            requestAnimationFrame(() => {
                slotIdnoInput.value?.focus()
            })
            return
        }

        if (prev) {
            inputValue.value = ''
        }
    }
)

watch(
    () => props.resetKey,
    () => {
        inputValue.value = ''
    }
)

function clearPanasonicMaterialInputFallback() {
    if (typeof document === 'undefined') return

    const materialInput = document.querySelector<HTMLInputElement>(
        '[data-testid="panasonic-main-material-input"] input'
    )
    if (!materialInput) return

    materialInput.value = ''
    materialInput.dispatchEvent(new Event('input', { bubbles: true }))

    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('panasonic-slot-submitted'))
    }
}

async function onSubmit() {
    const raw = inputValue.value.trim()
    if (!raw) {
        emit('error', '請輸入槽位')
        return
    }

    // Non-empty Enter should clear slot input immediately.
    inputValue.value = ''
    clearPanasonicMaterialInputFallback()

    if (props.beforeSubmit) {
        const shouldContinue = await props.beforeSubmit(raw)
        if (!shouldContinue) {
            emit('done')
            return
        }
    }

    if (!props.hasMaterial) {
        emit('error', '請先掃描物料條碼')
        emit('done')
        return
    }

    let slot = ''
    let subSlot = ''
    if (props.parseSlotIdno) {
        const parsed = props.parseSlotIdno(raw)
        if (!parsed) {
            emit('error', '槽位格式錯誤')
            emit('done')
            return
        }

        slot = parsed.slot
        subSlot = parsed.subSlot
    } else {
        const parts = raw.split('-')
        slot = parts[0]
        subSlot = parts[1] ?? ''
    }

    emit('submit', {
        slotIdno: raw,
        slot,
        subSlot
    })
}

function focus() {
    slotIdnoInput.value?.focus()
}

function clear() {
    inputValue.value = ''
}

defineExpose({ focus, clear })
</script>

<template>
    <n-form size="large" :model="formValue" @submit.prevent="onSubmit">
        <n-form-item label="打件機料件槽位">
            <n-input
                ref="slotIdnoInput"
                v-model:value="inputValue"
                :disabled="props.disabled"
                :data-testid="props.inputTestId"
            />
        </n-form-item>
    </n-form>
</template>
