<script lang="ts" setup>
/* eslint-disable no-restricted-imports -- [Phase-1 whitelist] tracked in REFACTORING_BASELINE.md, fix in Phase 3 */
import { DataTableColumns, NCard, NDataTable, NSpace, NTag, useMessage } from 'naive-ui'
import { ref, watch } from 'vue'
import { PanasonicMounterFileItemRead, PanasonicMounterFileRead, SmtService } from '@/client'
import { resolveMounterItemTargets } from '@/domain/file-manager/resolveMounterItemTargets'

type PanasonicMounterFileItemRow = PanasonicMounterFileItemRead & {
    board_side: 'B' | 'T'
}

const props = defineProps<{
    mounterFileRead: PanasonicMounterFileRead
    idB?: number | null
    idT?: number | null
}>()

const message = useMessage()

const columns: DataTableColumns<PanasonicMounterFileItemRow> = [
    { title: 'PCB Side', key: 'board_side', resizable: true, width: 90 },
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

const tableLoading = ref<boolean>( false )
const data = ref<PanasonicMounterFileItemRow[]>( [] )

function resolveTargets(): Array<{ id: number; side: 'B' | 'T' }> {
    return resolveMounterItemTargets( {
        id: props.mounterFileRead?.id,
        boardSide: props.mounterFileRead?.board_side,
        idB: props.idB,
        idT: props.idT,
    } )
}

watch(
    () => [ props.mounterFileRead?.id, props.mounterFileRead?.board_side, props.idB, props.idT ],
    async () => {
        const targets = resolveTargets()
        if ( targets.length === 0 ) {
            data.value = []
            tableLoading.value = false
            return
        }

        tableLoading.value = true
        try {
            const responses = await Promise.all(
                targets.map( ( target ) => SmtService.getPanasonicMounterFileItemList( { id: target.id } ) )
            )

            data.value = responses.flatMap( ( rows, index ) =>
                rows.map( ( row ) => ( {
                    ...row,
                    board_side: targets[ index ].side,
                } ) )
            )
        }
        catch ( error ) {
            console.error( error )
            message.error( '取得料件資料失敗' )
        }
        finally {
            tableLoading.value = false
        }
    },
    { immediate: true }
)
</script>

<template>
    <n-card style="width: 80%" :bordered="false" size="huge" role="dialog" aria-modal="true">
        <template #header>
            <n-space size="large">
                {{ props.mounterFileRead.product_idno }}
                <n-tag>機台：{{ props.mounterFileRead.mounter_idno }}</n-tag>
                <n-tag>PCB 板打件面：{{ props.mounterFileRead.board_side }}</n-tag>
            </n-space>
        </template>
        <n-data-table :columns="columns" :data="data" size="small" :max-height="'50vh'" :loading="tableLoading"
            :scroll-x="2100"></n-data-table>
    </n-card>
</template>
