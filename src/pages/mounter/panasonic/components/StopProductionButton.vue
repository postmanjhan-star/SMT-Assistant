<script setup lang="ts">
import { useDialog } from 'naive-ui'

const props = defineProps<{
    uuid: string
    stopProduction: (uuid: string) => Promise<unknown>
}>()

const emit = defineEmits<{
    (e: 'stopped'): void
    (e: 'error', msg: string): void
}>()

const dialog = useDialog()

async function onClickStop() {
    dialog.warning({
        title: '結束生產確認',
        content: '確定要結束生產嗎？',
        positiveText: '確定',
        negativeText: '取消',
        onPositiveClick: async () => {
            try {
                await props.stopProduction(props.uuid)
                emit('stopped')
            } catch (err) {
                emit('error', '結束生產失敗')
            }
        }
    })
}
</script>

<template>
    <n-button type="error" size="small" @click="onClickStop">
        🛑 結束生產
    </n-button>
</template>
