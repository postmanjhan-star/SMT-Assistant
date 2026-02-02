<script setup lang="ts">
import { GetRowIdParams, GridOptions, RowNode } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css"; // Core grid CSS, always needed
import "ag-grid-community/styles/ag-theme-balham.css"; // Optional theme CSS
import { AgGridVue } from "ag-grid-vue3"; // the AG Grid Vue Component
import { InputInst, NButton, NForm, NFormItem, NGi, NGrid, NInput, NP, NPageHeader, NSpace, NTag, useDialog, useMessage } from 'naive-ui';
import * as Tone from 'tone'
import { onMounted, ref } from 'vue'
import { useMeta } from 'vue-meta'
import { useRoute, useRouter } from 'vue-router'
import {
    ApiError,
    CheckMaterialMatchEnum,
    FujiMounterFileRead,
    FujiMounterItemStatCreate,
    ProduceTypeEnum,
    SmtMaterialInventory,
    SmtService,
    BoardSideEnum
} from '@/client';

const route = useRoute()
const router = useRouter()
const message = useMessage()
const dialog = useDialog()
useMeta( { title: 'Fuji Mounter Assistant' } )

const MODE_NAME_TESTING = '🧪 試產生產模式'
const MODE_NAME_NORMAL = '✅ 正式生產模式'

const workOrderIdno = ref<string>( route.params.workOrderIdno.toString() )
const productIdno = ref<string>( route.query.product_idno.toString() )
const boardSide = ref<BoardSideEnum>( route.query.work_sheet_side as BoardSideEnum )
const mounterIdno = ref<string>( route.params.mounterIdno.toString() )
const isTestingMode = ref<boolean>( route.query.testing_mode === '1' )

const productionUuid = ref<string>( '' )
const productionStarted = ref( false )

const slotFormValue = ref( { slotIdno: '' } );
const slotIdnoInput = ref<InputInst>();

const materialFormValue = ref( { materialInventoryIdno: '' } );
const materialInventoryIdnoInput = ref<InputInst>();
let materialInventoryFromScan: SmtMaterialInventory | null = null;

type RowModel = {
    correct: CheckMaterialMatchEnum | null,
    id: number,
    mounterIdno: string,
    boardSide: string,
    stage: string,
    slot: number,
    materialIdno: string,
    operatorIdno: string | null,
    materialInventoryIdno: string | null,
    remark?: string,
}

const rowData = ref<RowModel[]>( [] );

const gridOptions: GridOptions = {
    columnDefs: [
        { field: "correct", headerName: '', flex: 1, minWidth: 60, refData: { 'MATCHED_MATERIAL_PACK': '✅', 'UNMATCHED_MATERIAL_PACK': '❌', 'TESTING_MATERIAL_PACK': '⚠️' } },
        { field: "mounterIdno", headerName: '機台', flex: 1, minWidth: 90 },
        { field: "stage", headerName: 'Stage', flex: 1, minWidth: 90 },
        { field: "slot", headerName: '槽位', flex: 1, minWidth: 90 },
        { field: "boardSide", headerName: 'PCB面', flex: 1, minWidth: 90 },
        { field: "materialIdno", headerName: '物料號', flex: 4, minWidth: 160 },
        { field: "operatorIdno", headerName: '上料人員', flex: 4, minWidth: 160 },
        { field: "materialInventoryIdno", headerName: '單包條碼', flex: 5, minWidth: 180 },
        { field: "remark", headerName: '備註', flex: 3, minWidth: 120 },
    ],
    defaultColDef: { editable: false, filter: true, sortable: true, resizable: true },
    enableCellChangeFlash: true,
    rowSelection: 'multiple',
    suppressCellFocus: true,
    getRowId: ( params: GetRowIdParams<RowModel> ) => `${ params.data.mounterIdno }-${ params.data.stage }-${ params.data.slot }`,
}

onMounted( async () => {
    let fstDataArray: FujiMounterFileRead[] = [];
    try {
        fstDataArray = await SmtService.getFujiMounterMaterialSlotPairs( {
            workOrderIdno: workOrderIdno.value,
            mounterIdno: mounterIdno.value,
            productIdno: productIdno.value,
            boardSide: boardSide.value,
            testingMode: isTestingMode.value,
            testingProductIdno: isTestingMode.value ? route.query.testing_product_idno as string : null,
        } )
    }
    catch ( error ) {
        if ( error instanceof ApiError && error.status === 404 ) { router.push( '/http-status/404' ) }
        else {
            message.error( "讀取打件資料失敗" );
            console.error( error );
        }
    }

    const newRowData: RowModel[] = []
    for ( let masterData of fstDataArray ) {
        for ( let detailData of masterData.fuji_mounter_file_items ) {
            let stage = detailData.stage;
            if (stage === '1') stage = 'A';
            else if (stage === '2') stage = 'B';
            else if (stage === '3') stage = 'C';
            else if (stage === '4') stage = 'D';

            newRowData.push( {
                id: detailData.id,
                mounterIdno: masterData.mounter_idno,
                boardSide: masterData.board_side,
                stage: stage,
                slot: detailData.slot,
                operatorIdno: null,
                materialIdno: detailData.part_number,
                materialInventoryIdno: null,
                correct: null,
            } )
        }
    }
    rowData.value = newRowData;
} )

function onClickBackArrow ( event: Event ) { router.push( `/smt/fuji-mounter/` ) }

function parseSlotIdno ( slotIdno: string ) {
    // Slot barcode format: mounterId-stage-slotNumber, e.g., XP2B1-A-25
    const slotIdnoArray = slotIdno.split( '-' )
    if ( slotIdnoArray.length < 3 ) return [ null, null, null ];
    const machineIdno = slotIdnoArray[ 0 ];
    let stage = slotIdnoArray[ 1 ];

    // Handle numeric stage mapping if necessary (1->A, 2->B, etc.)
    if ( stage === '1' ) stage = 'A';
    else if ( stage === '2' ) stage = 'B';
    else if ( stage === '3' ) stage = 'C';
    else if ( stage === '4' ) stage = 'D';

    const slotNumber = Number( slotIdnoArray[ 2 ] );
    return [ machineIdno, stage, slotNumber ]
}

async function playSuccessTone () {
    await Tone.start();
    const synth = new Tone.Synth().toDestination();
    const now = Tone.now()
    synth.triggerAttackRelease( "C4", "8n", now )
    synth.triggerAttackRelease( "G4", "8n", now + 0.1 )
}

async function playErrorTone () {
    await Tone.start();
    const synth = new Tone.Synth().toDestination();
    const now = Tone.now()
    synth.triggerAttackRelease( "D3", "8n", now )
    synth.triggerAttackRelease( "D3", "8n", now + 0.2 )
}

async function showSuccess ( msg: string ) {
    await playSuccessTone()
    message.success( msg )
}

async function showError ( msg: string ) {
    await playErrorTone()
    message.error( msg )
}

function getMaterialMatchedRows ( materialIdno: string ): RowModel[] {
    return rowData.value.filter( row => row.materialIdno === materialIdno && ( !row.materialInventoryIdno || row.correct !== CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK ) )
}

async function checkAndStartProduction() {
    if (isTestingMode.value || rowData.value.length === 0) {
        return;
    }

    const allCorrect = rowData.value.every(r => r.correct === CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK);

    if (allCorrect) {
        await showSuccess('所有物料已正確上料，將自動開始生產...');
        await startProductionUpload();
    }
}

function resetForms () {
    materialFormValue.value.materialInventoryIdno = ''
    slotFormValue.value.slotIdno = ''
    materialInventoryFromScan = null;
    materialInventoryIdnoInput.value?.focus()
}

async function onSubmitMaterialInventoryForm ( event: Event ) {
    const idno = materialFormValue.value.materialInventoryIdno.trim();
    if ( !idno ) return message.warning( '請輸入物料號' );

    try {
        materialInventoryFromScan = await SmtService.getMaterialInventoryForSmt( { materialInventoryIdno: idno } )
    } catch ( error ) {
        if ( isTestingMode.value && error instanceof ApiError && error.status === 404 ) {
            message.info( `${ MODE_NAME_TESTING }：使用測試物料 ${ idno }` );
            materialInventoryFromScan = {
                idno: idno,
                material_idno: `TEST-${ idno }`,
                material_id: 0,
                material_name: 'Testing Material'
            } as unknown as SmtMaterialInventory;
        } else {
            const msg = { 404: '查無此條碼', 504: 'ERP 連線超時', 502: 'ERP 連線錯誤' }[ ( error as ApiError ).status ] ?? '條碼查詢失敗';
            showError( msg );
            resetForms();
            return;
        }
    }

    const matchedRows = getMaterialMatchedRows( materialInventoryFromScan.material_idno );
    if ( matchedRows.length === 0 ) {
        if ( !isTestingMode.value ) {
            showError( '無匹配槽位或槽位已上料' );
            resetForms();
            return;
        } else {
            message.info( '無匹配槽位，請掃描任意槽位以強制綁定' );
        }
    }

    slotIdnoInput.value?.focus();
}

async function onSubmitSlotForm ( event: Event ) {
    const inputSlotIdno = slotFormValue.value.slotIdno.trim();
    if ( !inputSlotIdno ) return message.warning( '請輸入槽位' );
    if ( !materialInventoryFromScan ) return showError( '請先掃描物料條碼' );

    const [ mounter, stage, slot ] = parseSlotIdno( inputSlotIdno );
    if ( !mounter ) return showError( '槽位條碼格式錯誤' );

    const matchedRows = getMaterialMatchedRows( materialInventoryFromScan.material_idno );
    const targetRow = matchedRows.find( r => r.mounterIdno === mounter && r.stage === stage && r.slot === slot );

    if ( targetRow ) {
        targetRow.materialInventoryIdno = materialInventoryFromScan.idno;
        targetRow.correct = CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK;
        gridOptions.api.applyTransaction( { update: [ targetRow ] } );
        showSuccess( `槽位 ${ stage }-${ slot } 綁定成功` );
    } else {
        if ( isTestingMode.value ) {
            const rowNode = gridOptions.api.getRowNode( `${ mounter }-${ stage }-${ slot }` );
            if ( rowNode ) {
                rowNode.data.materialInventoryIdno = materialInventoryFromScan.idno;
                rowNode.data.correct = CheckMaterialMatchEnum.TESTING_MATERIAL_PACK;
                rowNode.data.remark = `[廠商測試新料]`;
                gridOptions.api.applyTransaction( { update: [ rowNode.data ] } );
                showSuccess( `${ MODE_NAME_TESTING }：槽位 ${ stage }-${ slot } 已標記為測試料` );
            } else {
                showError( `找不到輸入的槽位 ${ inputSlotIdno }` );
            }
        } else {
            const rowNode = gridOptions.api.getRowNode( `${ mounter }-${ stage }-${ slot }` );
            if ( rowNode ) {
                rowNode.data.materialInventoryIdno = materialInventoryFromScan.idno;
                rowNode.data.correct = CheckMaterialMatchEnum.UNMATCHED_MATERIAL_PACK;
                gridOptions.api.applyTransaction( { update: [ rowNode.data ] } );
            }
            showError( `錯誤的槽位，此物料應放置於 ${ matchedRows.map( r => `${ r.stage }-${ r.slot }` ).join( ', ' ) }` );
        }
    }
    resetForms();
    await checkAndStartProduction();
}

async function onProduction () {
    const invalidRows = rowData.value.filter( r => !r.correct && !isTestingMode.value );
    if ( invalidRows.length > 0 ) {
        return showError( '尚有槽位未上料，不能開始生產' );
    }

    dialog.warning( {
        title: '開始生產確認',
        content: '確定要開始生產嗎？',
        positiveText: '確定',
        negativeText: '取消',
        onPositiveClick: () => startProductionUpload(),
    } )
}

function handleProductionStarted( productionStatUuid: string ) {
    // 1️⃣ 更新狀態
    productionStarted.value = true
    productionUuid.value = productionStatUuid

    // 2️⃣ 更新 URL（保留 query，但移除 testing_mode）
    const newQuery: any = { ...route.query, uuid: productionStatUuid }
    delete newQuery.testing_mode
    delete newQuery.testing_product_idno

    router.replace( {
        path: route.path,
        query: newQuery
    } )

    // 3️⃣ 導向 UUID 頁
    router.push( `/smt/fuji-mounter-production/${ productionStatUuid }` )
}

async function startProductionUpload () {
    try {
        const payload: FujiMounterItemStatCreate[] = rowData.value.map( row => ( {
            work_order_no: workOrderIdno.value,
            product_idno: productIdno.value,
            machine_idno: row.mounterIdno,
            board_side: boardSide.value,
            slot_idno: row.slot.toString(),
            sub_slot_idno: row.stage,
            material_idno: row.materialIdno,
            material_pack_code: row.materialInventoryIdno ?? null,
            produce_mode: isTestingMode.value ? ProduceTypeEnum.TESTING_PRODUCE_MODE : ProduceTypeEnum.NORMAL_PRODUCE_MODE,
            check_pack_code_match: row.correct,
            operator_id: null,
            operation_time: new Date().toISOString(),
            production_start: new Date().toISOString(),
        } ) );

        console.log(payload)

        // 假設後端會新增此 API
        const response = await SmtService.addFujiMounterItemStats( { requestBody: payload } );

        // 假設後端回傳的資料包含 production_id
        if ( response && response.length > 0 && response[ 0 ].uuid ) {
            showSuccess( '開始生產，資料上傳成功' );
            handleProductionStarted( response[ 0 ].uuid );
        } else {
            showError( '開始生產失敗，後端未回傳生產ID' );
        }
    } catch ( err ) {
        console.error( 'upload failed: ', err );
        showError( '資料上傳失敗' );
    }
}

async function onStopProduction () {
    if ( !productionUuid.value ) return showError( '沒有生產ID，無法停止' );
    dialog.warning( {
        title: '停止生產確認',
        content: '確定要停止生產嗎？',
        positiveText: '確定',
        negativeText: '取消',
        onPositiveClick: async () => {
            try {
                // 假設後端會新增此 API
                await SmtService.updateFujiItemStatsEndTime( { uuid: productionUuid.value } );
                productionStarted.value = false;
                showSuccess( '生產已結束' );
                router.push( '/smt/fuji-mounter/' );
            } catch ( e ) {
                showError( '停止生產失敗' );
                console.error( e );
            }
        },
    } );
}
</script>



<template>
    <n-space vertical :wrap-item="false" style="height: calc(100vh - 60px);">
        <n-space vertical size="small"
            style="padding: 0px 1rem 0 1rem; position: sticky; top: 60px; background-color: var(--body-color); z-index: 1;">
            <n-page-header @back="onClickBackArrow($event)" style="margin-bottom: 1rem;">
                <template #title>
                    <div style="display: flex; align-items: center; gap: 8px; white-space: nowrap;">
                        <span>{{ mounterIdno }}</span>
                        <n-tag :type="isTestingMode ? 'warning' : 'success'" size="small" bordered>
                            {{ isTestingMode ? MODE_NAME_TESTING : MODE_NAME_NORMAL }}
                        </n-tag>
                    </div>
                </template>
                <template #default>
                    <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                        <n-space size="small">
                            <n-p>工單：<n-tag type="info" size="small">{{ workOrderIdno }}</n-tag></n-p>
                            <n-p>成品料號：<n-tag type="info" size="small">{{ productIdno }}</n-tag></n-p>
                            <n-p>工件面向：<n-tag type="info" size="small">{{ boardSide }}</n-tag></n-p>
                        </n-space>
                        <n-space size="small">
                            <n-button v-if="!productionStarted" type="success" size="small" @click="onProduction">
                                🚀 開始生產
                            </n-button>
                            <n-button v-else type="error" size="small" @click="onStopProduction">
                                🛑 結束生產
                            </n-button>
                        </n-space>
                    </div>
                </template>
            </n-page-header>

            <n-grid cols="1 s:2" responsive="screen" x-gap="20">
                <n-gi>
                    <n-form size="large" :model="materialFormValue" @submit.prevent="onSubmitMaterialInventoryForm">
                        <n-form-item label="物料單包條碼">
                            <n-input type="text" size="large" v-model:value.lazy="materialFormValue.materialInventoryIdno"
                                autofocus ref="materialInventoryIdnoInput" :disabled="productionStarted" />
                        </n-form-item>
                    </n-form>
                </n-gi>
                <n-gi>
                    <n-form size="large" :model="slotFormValue" @submit.prevent="onSubmitSlotForm">
                        <n-form-item label="位置">
                            <n-input type="text" size="large" v-model:value.lazy="slotFormValue.slotIdno"
                                ref="slotIdnoInput" :disabled="productionStarted" />
                        </n-form-item>
                    </n-form>
                </n-gi>
            </n-grid>
        </n-space>

        <div style="height: 2000px; padding: 1rem;">
            <ag-grid-vue class="ag-theme-balham-dark" :rowData="rowData" style="height: 100%;"
                :gridOptions="gridOptions">
            </ag-grid-vue>
        </div>
    </n-space>
</template>



<style>
.ag-cell-wrapper {
    height: 100%;
}
</style>
