<script lang="ts" setup>
import { DataTableColumns, NCard, NDataTable, NSpace, NTag } from 'naive-ui'
import { ref, watch } from 'vue'
import type { FujiMounterFileItemRead, FujiMounterFileRead } from '@/application/preproduction/clientTypes'
import { resolveMounterItemTargets } from '@/domain/file-manager/resolveMounterItemTargets'
import { useUiNotifier } from '@/ui/shared/composables/useUiNotifier'
import { createMounterFileManagerDeps } from '@/ui/di/shared/createMounterFileManagerDeps'

const fileManagerDeps = createMounterFileManagerDeps()

type FujiMounterFileItemRow = FujiMounterFileItemRead & {
    board_side: 'B' | 'T'
}

const props = defineProps<{
    mounterFileRead: FujiMounterFileRead
    idB?: number | null
    idT?: number | null
}>()

const { notifyError } = useUiNotifier()

const columns: DataTableColumns<FujiMounterFileItemRow> = [
    { title: 'PCB Side', key: 'board_side', resizable: true, width: 90 },
    { title: 'Stage', key: 'stage', resizable: true, width: 80 },
    { title: 'Slot', key: 'slot', resizable: true, width: 80 },
    { title: 'Part No', key: 'part_number', resizable: true, ellipsis: { tooltip: true }, width: 160 },
    { title: 'Qty', key: 'feed_count', resizable: true, width: 80 },
    { title: 'Feeder Name', key: 'feeder_name', resizable: true, ellipsis: { tooltip: true }, width: 200 },
]

const tableLoading = ref<boolean>( false )
const data = ref<FujiMounterFileItemRow[]>( [] )

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
                targets.map( ( target ) => fileManagerDeps.getFujiFileItemList( target.id ) )
            )

            data.value = responses.flatMap( ( rows, index ) =>
                rows.map( ( row ) => ( {
                    ...row,
                    board_side: targets[ index ].side,
                } ) )
            )
        } catch ( error ) {
            console.error( error )
            notifyError( '取得料件資料失敗' )
        } finally {
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
            :scroll-x="1200"></n-data-table>
    </n-card>
</template>
