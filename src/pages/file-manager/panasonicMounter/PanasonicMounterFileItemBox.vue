<script lang="ts" setup>
import { DataTableColumns, NCard, NDataTable, NSpace, NTag, useMessage, } from 'naive-ui'
import { PropType, onMounted, ref } from 'vue'
import { PanasonicMounterFileItemRead, PanasonicMounterFileRead, SmtService } from '@/client'


const props = defineProps( { mounterFileRead: Object as PropType<PanasonicMounterFileRead> } )
const message = useMessage()

const columns: DataTableColumns = [
    { title: 'Stage', key: 'stage_idno', resizable: true, width: 80 },
    { title: 'Slot', key: 'slot_idno', resizable: true, width: 80 },
    { title: 'Sub Slot', key: 'sub_slot_idno', resizable: true, width: 100 },
    { title: 'SMD Model', key: 'smd_model_idno', resizable: true, ellipsis: { tooltip: true }, width: 160 },
    { title: 'Feeder', key: 'feeder_idno', resizable: true, width: 100 },
    { title: 'SMD Quantity', key: 'smd_quantity', resizable: true, ellipsis: { tooltip: true }, width: 140 },
    { title: 'Reference', key: 'reference_idno', resizable: true, ellipsis: { tooltip: true }, width: 200 },
    { title: 'SMD Description', key: 'smd_description', resizable: true, ellipsis: { tooltip: true }, width: 200 },
    { title: 'SMD Alternative', key: 'smd_alternative', resizable: true, ellipsis: { tooltip: true }, width: 160 },
    { title: 'Feeder Type Remark 1', key: 'feeder_type_remark_1', resizable: true, ellipsis: { tooltip: true }, width: 200 },
    { title: 'Feeder Type Remark 2', key: 'feeder_type_remark_2', resizable: true, ellipsis: { tooltip: true }, width: 200 },
]

const tableLoading = ref<boolean>( true )

const data = ref<PanasonicMounterFileItemRead[]>( [] )

onMounted( async () => {
    try {
        data.value = await SmtService.getPanasonicMounterFileItemList( { id: props.mounterFileRead.id } )
        tableLoading.value = false
    }
    catch ( error ) {
        console.error( error )
        message.error( '讀取失敗' )
    }
} )
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
            :scroll-x=" 2000 "></n-data-table>
    </n-card>
</template>
