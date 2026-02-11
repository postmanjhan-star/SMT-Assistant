<script setup lang="ts">
import { GetRowIdParams, GridOptions } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css"; // Core grid CSS, always needed
import "ag-grid-community/styles/ag-theme-balham.css"; // Optional theme CSS
import { AgGridVue } from "ag-grid-vue3"; // the AG Grid Vue Component
import { NButton, NGi, NGrid, NP, NPageHeader, NSpace, NTag, useDialog } from 'naive-ui';
import { computed, onMounted, ref, shallowRef } from 'vue'
import { useMeta } from 'vue-meta'
import { useRoute, useRouter } from 'vue-router'
import { ApiError, CheckMaterialMatchEnum, ProduceTypeEnum } from '@/client';
import type { BoardSideEnum, FujiMounterItemStatCreate, SmtMaterialInventory } from '@/client';
import { useUiNotifier } from '@/ui/shared/composables/useUiNotifier';
import {
    useFujiProductionState,
    type FujiMounterRowModel,
} from '@/ui/pre-production/fuji/useFujiProductionState'
import { SlotSubmissionRunner } from '@/application/slot-submit/SlotSubmissionRunner'
import { FujiMounterGridAdapter } from '@/ui/pre-production/fuji/FujiMounterGridAdapter'
import MaterialInventoryBarcodeInput from '@/pages/components/MaterialInventoryBarcodeInput.vue'
import SlotIdnoInput from '@/pages/components/SlotIdnoInput.vue'
import { SimpleBarcodeValidator } from '@/domain/material/BarcodeValidator'
import { ApiMaterialRepository } from '@/infra/material/ApiMaterialRepository'
import { BarcodeScanUseCase } from '@/application/barcode-scan/BarcodeScanUseCase'
import { findAvailableMaterialRows } from '@/domain/material/FujiMaterialMatchRules'
import { parseFujiSlotIdno } from '@/domain/slot/FujiSlotParser'
import { loadFujiProductionSlots } from '@/application/preproduction/FujiProductionLoadUseCase'
import { startFujiProduction } from '@/application/fuji/production/StartFujiProduction'
import { stopFujiProduction } from '@/application/fuji/production/StopFujiProduction'
import { NormalModeStrategy } from '@/application/slot-submit/NormalModeStrategy'
import { TestingModeStrategy } from '@/application/slot-submit/TestingModeStrategy'
import type { SlotSubmitStoreLike } from '@/application/slot-submit/SlotSubmitDeps'

const route = useRoute()
const router = useRouter()
const MODE_NAME_TESTING = '🧪 試產生產模式'
const MODE_NAME_NORMAL = '✅ 正式生產模式'

const workOrderIdno = ref<string>( route.params.workOrderIdno.toString() )
const productIdno = ref<string>( route.query.product_idno.toString() )
const boardSide = ref<BoardSideEnum>( route.query.work_sheet_side as BoardSideEnum )
const mounterIdno = ref<string>( route.params.mounterIdno.toString() )
const isTestingMode = ref<boolean>( route.query.testing_mode === '1' )

const dialog = useDialog()
const { success: showSuccess, warn: showWarn, error: showError } = useUiNotifier()
const { rows: rowData, setFromApi } = useFujiProductionState()

type RowModel = FujiMounterRowModel

const materialInventory = ref<SmtMaterialInventory | null>(null)
const slotIdnoInput = ref<{ focus: () => void } | null>(null)
const materialResetKey = ref(0)

const getMaterialMatchedRows = (materialIdno: string) =>
    findAvailableMaterialRows(rowData.value, materialIdno)

const materialScanUseCase = computed(
    () =>
        new BarcodeScanUseCase<RowModel>({
            validator: new SimpleBarcodeValidator(),
            materialRepository: new ApiMaterialRepository(),
            isTestingMode: isTestingMode.value,
            getMaterialMatchedRows,
        })
)

const scanMaterial = (barcode: string) => materialScanUseCase.value.execute(barcode)

function handleMaterialMatched(payload: { materialInventory: SmtMaterialInventory }) {
    materialInventory.value = payload.materialInventory
    slotIdnoInput.value?.focus()
}

function handleMaterialError(msg: string) {
    materialInventory.value = null
    showError(msg)
}

function resetMaterialState() {
    materialInventory.value = null
    materialResetKey.value += 1
}


const gridAdapter = shallowRef<FujiMounterGridAdapter<RowModel> | null>(null)

function onGridReady(params: { api: any }) {
    gridAdapter.value = new FujiMounterGridAdapter<RowModel>(params.api)
}

const toSlotKey = (
    machineIdno: string,
    stage: string,
    slot: string | number
) => `${machineIdno}-${stage}-${slot}`

const findRowByParsedSlot = (parsed: {
    machineIdno: string
    stage: string
    slot: number
}) =>
    rowData.value.find(
        row =>
            row.mounterIdno === parsed.machineIdno &&
            row.stage === parsed.stage &&
            row.slot === parsed.slot
    )

const slotSubmitStore: SlotSubmitStoreLike = {
    setLastResult(result) {
        if (!result) return
        if (result.type === 'success') return showSuccess(result.message)
        if (result.type === 'warn') return showWarn(result.message)
        return showError(result.message)
    },
    resetInputs() {
        resetMaterialState()
    },
    hasRow(rowId: string): boolean {
        const parsed = parseFujiSlotIdno(rowId)
        if (!parsed) return false
        return !!findRowByParsedSlot(parsed)
    },
    applyMatch(
        correctSlotIdno: string,
        materialInfo?: { idno?: string; remark?: string } | null,
        _inputSlot?: string,
        _inputSubSlot?: string | null
    ): boolean {
        const parsed = parseFujiSlotIdno(correctSlotIdno)
        if (!parsed) return false
        const adapter = gridAdapter.value
        if (!adapter) return false
        const row = findRowByParsedSlot(parsed)
        if (!row) return false
        adapter.markMatched(row, materialInfo?.idno ?? '')
        if (materialInfo?.remark) {
            row.remark = materialInfo.remark
        }
        return true
    },
    applyWarningBinding(
        slotIdno: string,
        materialInfo?: { idno?: string } | null,
        _remark?: string
    ): boolean {
        const parsed = parseFujiSlotIdno(slotIdno)
        if (!parsed) return false
        const adapter = gridAdapter.value
        if (!adapter) return false
        const row = findRowByParsedSlot(parsed)
        if (!row) return false
        adapter.markTesting(row, materialInfo?.idno ?? '')
        return true
    },
    applyMismatch(
        inputSlot: { slot: string; subSlot: string | null },
        _expectedSlotIdno: string,
        materialIdno?: string
    ) {
        const slotKey = `${inputSlot.slot}-${inputSlot.subSlot ?? ''}`
        const parsed = parseFujiSlotIdno(slotKey)
        if (!parsed) return
        const adapter = gridAdapter.value
        if (!adapter) return
        const row = findRowByParsedSlot(parsed)
        if (!row) return
        adapter.markUnmatched(row, materialIdno ?? '')
    },
}

const slotSubmitStrategy = computed(() => {
    return isTestingMode.value
        ? new TestingModeStrategy({ store: slotSubmitStore })
        : new NormalModeStrategy({ store: slotSubmitStore })
})
useMeta( { title: 'Fuji Mounter Assistant' } )

const productionUuid = ref<string>( '' )
const productionStarted = ref( false )



const gridOptions: GridOptions = {
    columnDefs: [
        {
            field: 'correct',
            headerName: '',
            flex: 1,
            minWidth: 60,
            refData: {
                MATCHED_MATERIAL_PACK: '✅',
                UNMATCHED_MATERIAL_PACK: '❌',
                TESTING_MATERIAL_PACK: '⚠️'
            }
        },
        { field: 'mounterIdno', headerName: '機台', flex: 1, minWidth: 90 },
        { field: 'stage', headerName: 'Stage', flex: 1, minWidth: 90 },
        { field: 'slot', headerName: '槽位', flex: 1, minWidth: 90 },
        { field: 'boardSide', headerName: 'PCB面', flex: 1, minWidth: 90 },
        { field: 'materialIdno', headerName: '物料號', flex: 4, minWidth: 160 },
        { field: 'operatorIdno', headerName: '上料人員', flex: 4, minWidth: 160 },
        { field: 'materialInventoryIdno', headerName: '物料條碼', flex: 5, minWidth: 180 },
        { field: 'remark', headerName: '備註', flex: 3, minWidth: 120 },
    ],
    defaultColDef: { editable: false, filter: true, sortable: true, resizable: true },
    enableCellChangeFlash: true,
    rowSelection: 'multiple',
    suppressCellFocus: true,
    getRowId: ( params: GetRowIdParams<RowModel> ) => `${ params.data.mounterIdno }-${ params.data.stage }-${ params.data.slot }`,
}

onMounted( async () => {
    try {
        const data = await loadFujiProductionSlots( {
            workOrderIdno: workOrderIdno.value,
            mounterIdno: mounterIdno.value,
            productIdno: productIdno.value,
            boardSide: boardSide.value,
            testingMode: isTestingMode.value,
            testingProductIdno: isTestingMode.value
                ? ( route.query.testing_product_idno as string )
                : null,
        } )
        setFromApi(data)
    } catch ( error ) {
        if ( error instanceof ApiError && error.status === 404 ) {
            router.push( '/http-status/404' )
        } else {
            showError('讀取檔案資料失敗')
            console.error( error )
        }
    }
} )

function onClickBackArrow ( event: Event ) { router.push( `/smt/fuji-mounter/` ) }

async function checkAndStartProduction() {
    if (isTestingMode.value || rowData.value.length === 0) {
        return;
    }

    const allCorrect = rowData.value.every(r => r.correct === CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK);

    if (allCorrect) {
        await showSuccess('所有物料已完成上料，準備進入正式生產...');
        await startProductionUpload();
    }
}

const { handleSlotSubmit } = SlotSubmissionRunner({
    submit: async (payload) => {
        const trimmed = payload.slotIdno.trim()
        if (!trimmed) {
            await showWarn('請輸入槽位')
            return false
        }

        const parsed = parseFujiSlotIdno(trimmed)
        if (!parsed) {
            await showError('槽位格式錯誤')
            return false
        }

        const slot = `${parsed.machineIdno}-${parsed.stage}`
        const subSlot = String(parsed.slot)
        const result = materialInventory.value
            ? {
                success: true,
                materialInventory: materialInventory.value,
                matchedRows: findAvailableMaterialRows(
                    rowData.value,
                    materialInventory.value.material_idno
                ).map(row => ({
                    slotIdno: `${row.mounterIdno}-${row.stage}`,
                    subSlotIdno: String(row.slot),
                })),
            }
            : null

        return slotSubmitStrategy.value.submit({
            result,
            slot,
            subSlot,
            slotIdno: toSlotKey(parsed.machineIdno, parsed.stage, parsed.slot),
        })
    },
    afterSuccess: async () => {
        resetMaterialState()
        await checkAndStartProduction()
    },
})




async function onProduction () {
    const invalidRows = rowData.value.filter( r => !r.correct && !isTestingMode.value );
    if ( invalidRows.length > 0 ) {
        return showError('尚有槽位未綁定，不能開始生產');
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

    // 2️⃣ 更新 URL（保留 query，並移除 testing_mode）
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

        // 假設後端已新增此 API
        const response = await startFujiProduction( payload );

        // 假設後端回傳 production_id
        if ( response && response.length > 0 && response[ 0 ].uuid ) {
            showSuccess('開始生產，資料已上傳');
            handleProductionStarted( response[ 0 ].uuid );
        } else {
            showError('開始生產失敗，後端未回傳生產ID');
        }
    } catch ( err ) {
        console.error( 'upload failed: ', err );
        showError('資料上傳失敗');
    }
}

async function onStopProduction () {
    if (!productionUuid.value) return showError('沒有生產ID，無法停止');
    dialog.warning( {
        title: '停止生產確認',
        content: '確定要停止生產嗎？',
        positiveText: '確定',
        negativeText: '取消',
        onPositiveClick: async () => {
            try {
                // 假設後端已新增此 API
                await stopFujiProduction( productionUuid.value );
                productionStarted.value = false;
                showSuccess('生產已結束');
                router.push( '/smt/fuji-mounter/' );
            } catch ( e ) {
                showError('停止生產失敗');
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
                                ▶️ 開始生產
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
                    <MaterialInventoryBarcodeInput :disabled="productionStarted" :is-testing-mode="isTestingMode"
                        :get-material-matched-rows="getMaterialMatchedRows" :reset-key="materialResetKey"
                        :scan="scanMaterial" :allow-no-match-in-testing="true" @matched="handleMaterialMatched"
                        @error="handleMaterialError" />
                </n-gi>
                <n-gi>
                    <SlotIdnoInput ref="slotIdnoInput" :disabled="productionStarted" :is-testing-mode="isTestingMode"
                        :has-material="!!materialInventory" @submit="handleSlotSubmit" @error="showError" />
                </n-gi>
            </n-grid>
        </n-space>

        <div style="height: 2000px; padding: 1rem;">
            <ag-grid-vue class="ag-theme-balham-dark" :rowData="rowData" style="height: 100%;"
                :gridOptions="gridOptions" @grid-ready="onGridReady">
            </ag-grid-vue>
        </div>
    </n-space>
</template>



<style>
.ag-cell-wrapper {
    height: 100%;
}
</style>
