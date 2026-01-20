<script setup lang="ts">
import { NButton, NModal, NPopconfirm, NSpace, useMessage, NTabs, NTabPane } from 'naive-ui'
import { CellComponent, TabulatorFull as Tabulator } from 'tabulator-tables'
import "tabulator-tables/dist/css/tabulator_bootstrap4.min.css"
import { onMounted, ref, watch } from 'vue'
import { useMeta } from 'vue-meta'
import { useRoute, useRouter } from 'vue-router'
import { PanasonicMounterFileRead, FujiMounterFileRead, SmtService } from '@/client'
import PanasonicMounterFileItemBox from './panasonicMounter/PanasonicMounterFileItemBox.vue'
import FujiMounterFileItemBox from './fujiMounter/FujiMounterFileItemBox.vue'

useMeta( { title: 'Mounter File Manager' } )
const route = useRoute()
const router = useRouter()
const message = useMessage()

const currentTab = ref<string>( 'panasonic' )

const mounterFileList = ref<PanasonicMounterFileRead[] | FujiMounterFileRead[]>( [] )

const editButtonDisable = ref<boolean>( true )
const deleteButtonDisable = ref<boolean>( true )
const showModal = ref<boolean>( false )

const tabulator = ref<Tabulator | null>( null ) //variable to hold your table
const table = ref<HTMLDivElement | null>( null ) //reference to your table element

const selectedRowData = ref<PanasonicMounterFileRead | FujiMounterFileRead>( null )

onMounted( async () => {
    await fetchData()

    // instantiate Tabulator when element is mounted
    tabulator.value = new Tabulator( table.value, {
        height: '100%', // set height of table (in CSS or here), this enables the Virtual DOM and improves render speed dramatically (can be any valid css height value)
        data: mounterFileList.value, //link data to table
        layout: "fitColumns", //fit columns to width of table (optional)
        reactiveData: true, //enable data reactivity
        columnDefaults: { title: '', headerSort: false, resizable: true },
        columns: [ //define table columns
            { title: '', hozAlign: "center", formatter: () => '🔍', cellClick: onClickShowDetailIcon, width: 50, resizable: false },
            { title: "檔名", field: "file_name", headerSort: true, headerFilter: 'input' },
            { title: "機種名稱", field: "product_idno", headerSort: true, headerFilter: 'input' },
            { title: "BOM版本", field: "product_ver", headerSort: true, hozAlign: "center", headerHozAlign: 'center' },
            { title: "PCB 板打件面", field: "board_side", hozAlign: "center", headerHozAlign: 'center', headerSort: true },
            { title: "建立日期", field: "created_at", hozAlign: "center", headerHozAlign: 'center', headerSort: true },
            { title: "更新日期", field: "updated_at", hozAlign: "center", headerHozAlign: 'center', headerSort: true },
            { title: "線別", field: "mounter_idno", hozAlign: "center", headerHozAlign: 'center' },
        ],
        selectable: 1,
    } )

    tabulator.value.on( 'rowSelectionChanged', function ( data: any[], rows ) {
        data.length > 0 ? editButtonDisable.value = false : editButtonDisable.value = true
        data.length > 0 ? deleteButtonDisable.value = false : deleteButtonDisable.value = true
    } )
} )

watch( currentTab, async () => {
    await fetchData()
} )

async function fetchData() {
    try {
        let data: any[] = []
        if ( currentTab.value === 'panasonic' ) {
            data = await SmtService.getPanasonicMounterFileList( {} )
        } else {
            data = await SmtService.getFujiMounterFileList( {} )
        }
        data.forEach( ( value ) => {
            if ( value.updated_at ) {
                value.updated_at = new Date( value.updated_at ).toISOString().split( 'T' )[ 0 ]
            }
            if ( value.created_at ) {
                value.created_at = new Date( value.created_at ).toISOString().split( 'T' )[ 0 ]
            }
        } )
        mounterFileList.value = data
        if ( tabulator.value ) {
            tabulator.value.replaceData( data )
        }
    } catch ( error ) {
        console.error( error )
        message.error( '資料讀取失敗' )
    }
}

async function onClickEditButton ( event: Event ) { }

async function onClickDeleteButton ( event: Event ) {
    const selectedRow = tabulator.value.getSelectedRows()[ 0 ]
    const selectedRowData = selectedRow.getData()
    try {
        let response = false
        if ( currentTab.value === 'panasonic' ) {
            response = await SmtService.deletePanasonicMounterFile( { id: selectedRowData.id } )
        } else {
            response = await SmtService.deleteFujiMounterFile( { id: selectedRowData.id } )
        }

        if ( response ) {
            await selectedRow.delete()
            message.success( '刪除成功' )
            editButtonDisable.value = true
            deleteButtonDisable.value = true
        } else { throw Error }
    } catch ( error ) {
        console.error( error )
        message.error( '刪除失敗' )
    }
}


async function onClickCsvUploadButton ( event: Event ) {
    if ( currentTab.value === 'panasonic' ) {
        router.push( { path: '/smt/panasonic-mounter/upload_csv' } )
    } else {
        router.push( { path: '/smt/fuji-mounter/upload_csv' } )
    }
}


function onClickShowDetailIcon ( e: UIEvent, cell: CellComponent ) {
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
            <!-- <n-button size="large" type="primary" tertiary @click=" onClickEditButton( $event ) "
                :disabled=" editButtonDisable ">編輯主紀錄</n-button> -->
            <n-popconfirm @positive-click=" onClickDeleteButton( $event ) " :negative-text=" null ">
                <template #trigger>
                    <n-button size="large" type="error" tertiary ref="deleteButton" :disabled=" deleteButtonDisable ">
                        刪除主紀錄
                    </n-button>
                </template>
                確認刪除？
            </n-popconfirm>

            <n-button size="large" type="primary" tertiary @click=" onClickCsvUploadButton( $event ) ">上傳 CSV 檔案</n-button>
        </n-space>
        <div style="height: calc(100vh - 13rem);">
            <div ref="table" class="table-dark table-striped"></div>
        </div>
    </n-space>

    <n-modal v-model:show=" showModal ">
        <div v-if="selectedRowData">
            <panasonic-mounter-file-item-box v-if="currentTab === 'panasonic'" :mounter-file-read=" selectedRowData as PanasonicMounterFileRead "></panasonic-mounter-file-item-box>
            <fuji-mounter-file-item-box v-else :mounter-file-read=" selectedRowData as FujiMounterFileRead "></fuji-mounter-file-item-box>
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
