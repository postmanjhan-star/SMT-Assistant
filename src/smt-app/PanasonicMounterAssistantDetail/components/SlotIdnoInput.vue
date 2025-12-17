<script setup lang="ts">
import { ref, watch } from 'vue'
import { NForm, NFormItem, NInput, useMessage, InputInst } from 'naive-ui'

const props = defineProps<{
    isTestingMode: boolean
    hasMaterial: boolean
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
    (val) => {
        if (val) {
            // 等 DOM ready
            requestAnimationFrame(() => {
                slotIdnoInput.value?.focus()
            })
        }
    }
)

function onSubmit() {
    const raw = formValue.value.slotIdno.trim()
    if (!raw) {
        emit('error', '請輸入插槽位置')
        return
    }

    if (!props.hasMaterial) {
        emit('error', '請先掃描物料條碼')
        return
    }

    const [slot, subSlot = ''] = raw.split('-')

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
}
</script>

<template>
    <n-form size="large" :model="formValue" @submit.prevent="onSubmit">
        <n-form-item label="打件機料件槽位">
            <n-input ref="slotIdnoInput" v-model:value.lazy="formValue.slotIdno" />
        </n-form-item>
    </n-form>
</template>
