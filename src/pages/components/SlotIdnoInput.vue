<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { NForm, NFormItem, NInput, useMessage, InputInst } from 'naive-ui'

const props = defineProps<{
    isTestingMode: boolean
    hasMaterial: boolean
    disabled?: boolean
    resetKey?: number
    parseSlotIdno?: (raw: string) => { slot: string; subSlot: string } | null
}>()

const emit = defineEmits<{
    (e: 'submit', payload: {
        slotIdno: string
        slot: string
        subSlot: string
    }): void
    (e: 'error', msg: string): void
    (e: 'done'): void
}>()

const message = useMessage()

const slotIdnoInput = ref<InputInst | null>(null)
const formValue = ref({
    slotIdno: ''
})

watch(
    () => props.hasMaterial,
    (val, prev) => {
        if (val) {
            // 蝑?DOM ready
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

async function onSubmit() {
    const raw = formValue.value.slotIdno.trim()
    if (!raw) {
        emit('error', '請輸入插槽位置')
        return
    }

    if (!props.hasMaterial) {
        emit('error', '請先掃描物料條碼')
        return
    }

    let slot = ''
    let subSlot = ''
    if (props.parseSlotIdno) {
        const parsed = props.parseSlotIdno(raw)
        if (!parsed) {
            emit('error', '槽位格式錯誤')
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

    formValue.value.slotIdno = ''
    slotIdnoInput.value?.focus()

      // ✅ 清 slot input（只清自己）
    formValue.value.slotIdno = ''

    // ✅ 告知父層「slot 已完成」
    emit('done')

    await nextTick()
    formValue.value.slotIdno = ''
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
        <n-input ref="slotIdnoInput" v-model:value="formValue.slotIdno" :disabled="props.disabled" />
        </n-form-item>
    </n-form>
</template>
