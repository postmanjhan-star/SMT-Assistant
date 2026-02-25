<script setup lang="ts">
import { ref, watch } from 'vue'
import { NForm, NFormItem, NInput, InputInst } from 'naive-ui'

const props = defineProps<{
    isTestingMode: boolean
    hasMaterial: boolean
    disabled?: boolean
    resetKey?: number
    inputTestId?: string
    parseSlotIdno?: (raw: string) => { slot: string; subSlot: string } | null
}>()

const emit = defineEmits<{
    (e: 'submit', payload: {
        slotIdno: string
        slot: string
        subSlot: string
    }): void
    (e: 'done'): void
    (e: 'error', msg: string): void
}>()

const slotIdnoInput = ref<InputInst | null>(null)
const formValue = ref({
    slotIdno: ''
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
            formValue.value.slotIdno = ''
        }
    }
)

watch(
    () => props.resetKey,
    () => {
        formValue.value.slotIdno = ''
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
    const raw = formValue.value.slotIdno.trim()
    if (!raw) {
        emit('error', '請輸入槽位')
        return
    }

    // Non-empty Enter should clear slot input immediately.
    formValue.value.slotIdno = ''
    clearPanasonicMaterialInputFallback()

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
    formValue.value.slotIdno = ''
}

defineExpose({ focus, clear })
</script>

<template>
    <n-form size="large" :model="formValue" @submit.prevent="onSubmit">
        <n-form-item label="打件機料件槽位">
            <n-input
                ref="slotIdnoInput"
                v-model:value="formValue.slotIdno"
                :disabled="props.disabled"
                :data-testid="props.inputTestId"
            />
        </n-form-item>
    </n-form>
</template>
