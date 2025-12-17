<script setup lang="ts">
import { useDialog } from 'naive-ui'
import { SmtService } from '@/client'

const props = defineProps<{
    uuid: string
}>()

const emit = defineEmits<{
    (e: 'stopped'): void
    (e: 'error', msg: string): void
}>()

const dialog = useDialog()

async function stopProduction() {
    dialog.warning({
        title: '結束生產確認',
        content: '確定要結束生產嗎？',
        positiveText: '確定',
        negativeText: '取消',
        onPositiveClick: async () => {
            try {
                await uploadEndProductionTime(props.uuid)
                emit('stopped')
            } catch (err) {
                emit('error', '結束生產失敗')
            }
        }
    })
}

async function uploadEndProductionTime(uuid: string) {
    await SmtService.updateTheStatsOfProductionEndTimeRecord({
        uuid,
        endTime: new Date().toISOString()
    })
}
</script>

<template>
    <n-button type="error" size="small" @click="stopProduction">
        🛑 結束生產
    </n-button>
</template>