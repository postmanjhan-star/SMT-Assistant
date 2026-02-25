<script setup lang="ts">
import { NButton, NModal, NPopconfirm, NSpace, useMessage, NTabs, NTabPane } from 'naive-ui'
import { CellComponent, TabulatorFull as Tabulator } from 'tabulator-tables'
import "tabulator-tables/dist/css/tabulator_bootstrap4.min.css"
import { onMounted, ref, watch } from 'vue'
import { useMeta } from 'vue-meta'
import { useRouter } from 'vue-router'
import { PanasonicMounterFileRead, FujiMounterFileRead, SmtService, ApiError } from '@/client'
import { mergeMounterFiles, type MergedMounterFileRow } from '@/domain/file-manager/mergeMounterFiles'
import PanasonicMounterFileItemBox from './panasonicMounter/PanasonicMounterFileItemBox.vue'
import FujiMounterFileItemBox from './fujiMounter/FujiMounterFileItemBox.vue'

useMeta( { title: 'Mounter File Manager' } )
const router = useRouter()
const message = useMessage()

const currentTab = ref<string>( 'panasonic' )
const mounterFileList = ref<MergedMounterFileRow[]>( [] )

const editButtonDisable = ref<boolean>( true )
const deleteButtonDisable = ref<boolean>( true )
const showModal = ref<boolean>( false )

const tabulator = ref<Tabulator | null>( null )
const table = ref<HTMLDivElement | null>( null )

const selectedRowData = ref<MergedMounterFileRow | null>( null )

onMounted( async () => {
    await fetchData()

    tabulator.value = new Tabulator( table.value, {
        height: '100%',
        data: mounterFileList.value,
        layout: 'fitColumns',
        reactiveData: true,
        columnDefaults: { title: '', headerSort: false, resizable: true },
        columns: [
            { title: '', hozAlign: 'center', formatter: () => '🔍', cellClick: onClickShowDetailIcon, width: 50, resizable: false },
            { title: '產品編號', field: 'product_idno', headerSort: true, headerFilter: 'input' },
            { title: 'BOM 版本', field: 'product_ver', headerSort: true, hozAlign: 'center', headerHozAlign: 'center' },
            { title: 'PCB 板打件面', field: 'board_side', hozAlign: 'center', headerHozAlign: 'center', headerSort: true },
            { title: '建立日期', field: 'created_at', hozAlign: 'center', headerHozAlign: 'center', headerSort: true },
            { title: '更新日期', field: 'updated_at', hozAlign: 'center', headerHozAlign: 'center', headerSort: true },
            { title: '上傳者', field: 'uploader', hozAlign: 'center', headerHozAlign: 'center', headerSort: true },
            { title: '機台', field: 'mounter_idno', hozAlign: 'center', headerHozAlign: 'center' },
        ],
        selectable: 1,
    } )

    tabulator.value.on( 'rowSelectionChanged', function ( data: any[] ) {
        editButtonDisable.value = data.length === 0
        deleteButtonDisable.value = data.length === 0
    } )
} )

watch( currentTab, async () => {
    await fetchData()
} )

async function fetchData() {
    try {
        let data: Array<PanasonicMounterFileRead | FujiMounterFileRead> = []
        if ( currentTab.value === 'panasonic' ) {
            data = await SmtService.getPanasonicMounterFileList( {} )
        } else {
            data = await SmtService.getFujiMounterFileList( {} )
        }

        const formattedData = data.map( ( value ) => ( {
            ...value,
            updated_at: value.updated_at
                ? new Date( value.updated_at ).toISOString().split( 'T' )[ 0 ]
                : '',
            created_at: value.created_at
                ? new Date( value.created_at ).toISOString().split( 'T' )[ 0 ]
                : '',
        } ) )

        const mergedData = mergeMounterFiles( formattedData )
        mounterFileList.value = mergedData

        if ( tabulator.value ) {
            tabulator.value.replaceData( mergedData )
        }
    } catch ( error ) {
        console.error( error )
        message.error( '取得資料失敗' )
    }
}

async function deleteMounterFileById( id: number ) {
    if ( currentTab.value === 'panasonic' ) {
        return SmtService.deletePanasonicMounterFile( { id } )
    }
    return SmtService.deleteFujiMounterFile( { id } )
}

async function onClickDeleteButton() {
    const selectedRow = tabulator.value?.getSelectedRows()[ 0 ]
    if ( !selectedRow ) return

    const rowData = selectedRow.getData() as MergedMounterFileRow

    try {
        if ( rowData.board_side === 'B+T' ) {
            if ( rowData.id_b == null || rowData.id_t == null ) {
                throw new Error( 'Missing board side ids for merged row.' )
            }

            const deletedB = await deleteMounterFileById( rowData.id_b )
            if ( !deletedB ) {
                throw new Error( 'Failed to delete B-side file.' )
            }

            const deletedT = await deleteMounterFileById( rowData.id_t )
            if ( !deletedT ) {
                throw new Error( 'Failed to delete T-side file.' )
            }
        } else {
            if ( rowData.id == null ) {
                throw new Error( 'Missing file id for delete.' )
            }

            const response = await deleteMounterFileById( rowData.id )
            if ( !response ) {
                throw new Error( 'Failed to delete file.' )
            }
        }

        message.success( '刪除成功' )
        editButtonDisable.value = true
        deleteButtonDisable.value = true
        selectedRowData.value = null
        showModal.value = false
    } catch ( error ) {
        if ( error instanceof ApiError && error.status === 409 ) {
            message.error( '檔案已被使用，無法刪除' )
        } else {
            console.error( error )
            message.error( '刪除失敗' )
        }
    } finally {
        await fetchData()
    }
}

function onClickCsvUploadButton() {
    router.push( { path: '/smt/file-upload' } )
}

function onClickShowDetailIcon( e: UIEvent, cell: CellComponent ) {
    const selectedRow = cell.getRow()
    selectedRow.select()
    selectedRowData.value = selectedRow.getData()
    showModal.value = true
}
</script>

<template>
    <n-space size="large" vertical style="padding: 1rem;">
        <n-tabs type="segment" v-model:value="currentTab">
            <n-tab-pane name="panasonic" tab="Panasonic"></n-tab-pane>
            <n-tab-pane name="fuji" tab="Fuji"></n-tab-pane>
        </n-tabs>
        <n-space size="large">
            <n-popconfirm @positive-click="onClickDeleteButton" :negative-text="null">
                <template #trigger>
                    <n-button size="large" type="error" tertiary ref="deleteButton" :disabled="deleteButtonDisable">
                        刪除打件檔
                    </n-button>
                </template>
                確定要刪除嗎？
            </n-popconfirm>

            <n-button size="large" type="primary" tertiary @click="onClickCsvUploadButton">上傳 CSV/FST 檔案</n-button>
        </n-space>
        <div style="height: calc(100vh - 13rem);">
            <div ref="table" class="table-dark table-striped"></div>
        </div>
    </n-space>

    <n-modal v-model:show="showModal">
        <div v-if="selectedRowData">
            <panasonic-mounter-file-item-box
                v-if="currentTab === 'panasonic'"
                :mounter-file-read="selectedRowData as any"
                :id-b="selectedRowData.id_b"
                :id-t="selectedRowData.id_t"
            ></panasonic-mounter-file-item-box>
            <fuji-mounter-file-item-box
                v-else
                :mounter-file-read="selectedRowData as any"
                :id-b="selectedRowData.id_b"
                :id-t="selectedRowData.id_t"
            ></fuji-mounter-file-item-box>
        </div>
    </n-modal>
</template>

<style>
.tabulator-col-sorter-element:hover {
    background-color: unset !important;
}

.tabulator-header-filter input {
    color: var(--text-color-base) !important;
    background-color: var(--input-color) !important;
}
</style>
