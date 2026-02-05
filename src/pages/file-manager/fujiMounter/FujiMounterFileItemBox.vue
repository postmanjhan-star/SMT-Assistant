<script lang="ts" setup>
import { DataTableColumns, NCard, NDataTable, NSpace, NTag, useMessage, } from 'naive-ui'
import { PropType, ref, watch } from 'vue'
import { FujiMounterFileItemRead, FujiMounterFileRead, SmtService } from '@/client'

const props = defineProps( { mounterFileRead: Object as PropType<FujiMounterFileRead> } )
const message = useMessage()

const columns: DataTableColumns = [
    { title: 'Stage', key: 'stage', resizable: true, width: 80 },
    { title: 'Slot', key: 'slot', resizable: true, width: 80 },
    { title: 'Part No', key: 'part_number', resizable: true, ellipsis: { tooltip: true }, width: 160 },
    { title: 'Qty', key: 'feed_count', resizable: true, width: 80 },
    { title: 'Feeder Name', key: 'feeder_name', resizable: true, ellipsis: { tooltip: true }, width: 200 },
]

const tableLoading = ref<boolean>( false )

const data = ref<FujiMounterFileItemRead[]>( [] )

watch( () => props.mounterFileRead, async ( newVal ) => {
    if ( !newVal?.id ) return
    tableLoading.value = true
    try {
        data.value = await SmtService.getFujiMounterFileItemList( { id: newVal.id } )
    } catch ( error ) {
        console.error( error )
        message.error( '讀取失敗' )
    } finally {
        tableLoading.value = false
    }
}, { immediate: true } )
</script>

<template>
    <n-card style="width: 80%" :bordered=" false " size="huge" role="dialog" aria-modal="true">
        <template #header>
            <n-space size="large">
                {{ props.mounterFileRead.product_idno }}
                <n-tag>機台：{{ props.mounterFileRead.mounter_idno }}</n-tag>
                <n-tag>PCB 板打件面：{{ props.mounterFileRead.board_side }}</n-tag>
            </n-space>
        </template>
        <n-data-table :columns=" columns " :data=" data " size="small" :max-height=" '50vh' " :loading=" tableLoading "
            :scroll-x=" 1000 "></n-data-table>
    </n-card>
</template>