<script setup lang="ts">
/* eslint-disable no-restricted-imports -- [Phase-1 whitelist] tracked in REFACTORING_BASELINE.md, fix in Phase 3 */
import { useDialog } from 'naive-ui'
import { stopPanasonicProductionStats as stopPanasonicProduction } from '@/infra/panasonic/production/PanasonicProductionApi'

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
    await stopPanasonicProduction({ uuid, endTime: new Date().toISOString() })
}
</script>

<template>
    <n-button type="error" size="small" @click="stopProduction">
        🛑 結束生產
    </n-button>
</template>
