<script setup lang="ts">

import { GetRowIdParams, GridApi, GridOptions, RowNode } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css"; // Core grid CSS, always needed
import "ag-grid-community/styles/ag-theme-balham.css"; // Optional theme CSS
import { AgGridVue } from "ag-grid-vue3"; // the AG Grid Vue Component
import { InputInst, NForm, NFormItem, NGi, NGrid, NInput, NP, NPageHeader, NSpace, NTag, useMessage, NModal, NRadioGroup, NRadioButton, NButton, FormRules, useDialog } from 'naive-ui';
import * as Tone from 'tone';
import { onMounted, ref } from 'vue';
import { useMeta } from 'vue-meta';
import { useRoute, useRouter } from 'vue-router';
import {
    ApiError,
    CheckMaterialMatchEnum,
    PanasonicMounterItemStatCreate,
    ProduceTypeEnum,
    SmtMaterialInventory,
    SmtService,
    BoardSideEnum,
    MachineSideEnum
} from '@/client';

import MaterialQueryModal from "./components/MaterialQueryModal.vue";
import StopProductionButton from "./components/StopProductionButton.vue";
import MaterialInventoryBarcodeInput from "./components/MaterialInventoryBarcodeInput.vue";
import SlotIdnoInput from "./components/SlotIdnoInput.vue";
import { usePostProductionFeed } from "@/composables/usePostProductionFeed";
import { usePostProductionFeedUploads } from "@/composables/usePostProductionFeedUploads";
import { usePostProductionRollShortage } from "@/composables/usePostProductionRollShortage";
import { usePostProductionFeedStore } from "@/stores/postProductionFeedStore";
import { usePanasonicProductionLoader } from "@/composables/usePanasonicProductionLoader";
import type { ProductionRowModel } from "@/domain/production/buildPanasonicRowData";

import { useDateFormatter } from '@/composables/useDateFormatter'

const { format } = useDateFormatter()


const route = useRoute();
const router = useRouter();
const message = useMessage();
useMeta({ title: 'Panasonic Mounter Assistant' });

const MODE_NAME_TESTING = '🧪 試產生產模式'
const MODE_NAME_NORMAL = '✅ 正式生產模式'

const workOrderIdno = ref<string>('')
const productIdno = ref<string>('')
const boardSide = ref<BoardSideEnum>(null)
const machineSide = ref<MachineSideEnum>(null)
const testingMode = ref<ProduceTypeEnum>(null)
const isTestingMode = ref<boolean>(false)
const productionUuid = ref<string>('')
const uploading = ref(false)
const postProductionFeedStore = usePostProductionFeedStore()
const { inspectionUpload, appendedMaterialUpload } =
    usePostProductionFeedUploads()

const { mounterData, rowData, productionStarted, load } =
    usePanasonicProductionLoader(productionUuid)
type SmtMaterialInventoryEx = SmtMaterialInventory & { remark?: string }
const slotIdnoInput = ref<InputInst>();
const slotFormValue = ref({
    slotIdno: '',
    materialInventoryIdno: '',
    remark: '',   // ✅ 新增 remark
})
const materialFormValue = ref({ materialInventoryIdno: '' });
const materialInventoryIdnoInput = ref<InputInst>();

const dialog = useDialog()


type RowModel = ProductionRowModel
const gridApi = ref<GridApi | null>(null);

function onGridReady(params: { api: GridApi }) {
    gridApi.value = params.api
}

const gridOptions: GridOptions = {
    // PROPERTIES
    // Column Definitions
    columnDefs: [
        { field: "correct", tooltipField: 'correct', headerName: '', flex: 1, minWidth: 60, refData: { 'MATCHED_MATERIAL_PACK': '✅', 'UNMATCHED_MATERIAL_PACK': '❌', 'TESTING_MATERIAL_PACK': '⚠️' } },
        {
            headerName: '巡檢料號',
            field: 'inspectMaterialPackCode', flex: 2, minWidth: 100
        },
        {
            headerName: '巡檢時間',
            field: 'inspectTime',
            flex: 2, minWidth: 150, valueFormatter: (params) => format(params.value)
        },
        { field: "slotIdno", tooltipField: 'slotIdno', headerName: '槽位', flex: 3, minWidth: 90 },
        { field: "subSlotIdno", tooltipField: 'subSlotIdno', headerName: '子槽位', flex: 1, minWidth: 100 },
        { field: "firstAppendTime", tooltipField: 'firstAppendTime', headerName: '上料時間', flex: 3, minWidth: 180, valueFormatter: (params) => format(params.value) },
        { field: "materialIdno", tooltipField: 'materialIdno', headerName: '物料號', flex: 4, minWidth: 140 },
        { field: "materialInventoryIdno", tooltipField: 'materialInventoryIdno', headerName: '單包代碼', flex: 5, minWidth: 140 },
        { field: "appendedMaterialInventoryIdno", tooltipField: 'appendedMaterialInventoryIdno', headerName: '接料代碼', flex: 5, minWidth: 140 },
        { field: "total", headerName: '總數', flex: 3, minWidth: 120 },
        { field: "remark", headerName: '備註', flex: 3, minWidth: 120 },
    ],
    defaultColDef: { editable: false, filter: true, sortable: true, resizable: true },

    // Column Moving
    suppressMovableColumns: false,
    suppressColumnMoveAnimation: true,

    // Editing
    stopEditingWhenCellsLoseFocus: true,
    enterNavigatesVerticallyAfterEdit: true,
    undoRedoCellEditing: true,

    // Miscellaneous
    rowBuffer: 100,
    valueCache: true,
    debug: false,

    // Pagination
    pagination: false,

    // Rendering
    enableCellChangeFlash: true,
    suppressColumnVirtualisation: true,
    suppressRowVirtualisation: false,
    domLayout: 'normal',
    getBusinessKeyForNode: (node: RowNode<RowModel>) => { return `${node.data.slotIdno}-${node.data.subSlotIdno}` },

    // RowModel
    rowModelType: 'clientSide',
    getRowId: (params: GetRowIdParams) => { return `${params.data.slotIdno}-${params.data.subSlotIdno}` },

    // Scrolling
    debounceVerticalScrollbar: false,

    // Selection
    enableCellTextSelection: true,
    rowSelection: 'multiple',
    suppressCellFocus: true,

    // Styling
    suppressRowTransform: true,

    // Tooltips
    enableBrowserTooltips: false,

    // // EVENTS
    // // Miscellaneous
    // onViewportChanged: ( event: ViewportChangedEvent ) => { event.columnApi.autoSizeAllColumns() },

    // // RowModel: Client-Side
    // onRowDataUpdated: ( event: RowDataUpdatedEvent ) => { event.columnApi.autoSizeAllColumns() },
}



onMounted(async () => {
    try {
        productionUuid.value = route.params.productionUuid.toString().trim()
        const { mounterData: loadedStats } = await load()

        const firstStat = loadedStats[0]
        if (!firstStat) return

        workOrderIdno.value = firstStat.work_order_no
        productIdno.value = firstStat.product_idno
        machineSide.value = firstStat.machine_side
        boardSide.value = firstStat.board_side
        testingMode.value = firstStat.produce_mode
        isTestingMode.value =
            testingMode.value === ProduceTypeEnum.TESTING_PRODUCE_MODE
    } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
            router.push("/http-status/404")
        } else if (error instanceof ApiError && error.status === 503) {
            router.push("/http-status/404")
        }
    }
})

const materialResetKey = ref(0)

function handleSlotDone() {
    // 清掉這一輪狀態
    postProductionFeedStore.clearMaterialResult()

    // 🔑 觸發 MaterialInput reset
    materialResetKey.value++
}

function onClickBackArrow(event: Event) { router.push(`/smt/panasonic-mounter/`); }


async function playSuccessTone() {
    await Tone.start();
    //create a synth and connect it to the main output (your speakers)
    const synth = new Tone.Synth().toDestination();
    //play a middle 'C' for the duration of an 8th note
    const now = Tone.now()
    synth.triggerAttackRelease("C4", "8n", now)
    synth.triggerAttackRelease("G4", "8n", now + 0.1)
    synth.triggerAttackRelease("F4", "8n", now + 0.2)
}

async function playErrorTone() {
    await Tone.start();
    //create a synth and connect it to the main output (your speakers)
    const synth = new Tone.Synth().toDestination();
    Tone.start();
    const now = Tone.now()
    synth.triggerAttackRelease("D4", "8n", now)
    // synth.triggerAttackRelease("A4", "8n", now + 0.1)
    synth.triggerAttackRelease("D4", "8n", now + 0.2)
}

async function showSuccess(msg: string) {
    await playSuccessTone()
    message.success(msg)
    return true
}

function showWarn(msg: string) {
    message.warning(msg)
    return false
}

async function showError(msg: string) {
    await playErrorTone()
    message.error(msg)
    return false
}

async function handleSlotSubmit({
    slot,
    subSlot,
    slotIdno
}: {
    slot: string
    subSlot: string
    slotIdno: string
}) {
    return submitPostProductionFeed({
        slot,
        subSlot,
        slotIdno,
        result: postProductionFeedStore.materialResult,
    })
}


function speak(text: string) {
    text = text.split('').join(', ') // Convert `10010` to `1,0,0,1,0` for speaking characters one by one
    const utterance = new SpeechSynthesisUtterance()
    utterance.text = text
    utterance.lang = 'zh-CN' // zh-CN is much louder and clear
    speechSynthesis.speak(utterance)
}

function resetSlotMaterialFormInputs() {
    slotFormValue.value.slotIdno = ''
    slotFormValue.value.materialInventoryIdno = ''
    slotFormValue.value.remark = ''
    materialFormValue.value.materialInventoryIdno = ''
    materialInventoryIdnoInput.value.focus()
}


function handleMaterialMatched(payload: {
    materialInventory: SmtMaterialInventoryEx
    matchedRows: any[]
}) {
    postProductionFeedStore.setMaterialResult({
        success: true,
        materialInventory: payload.materialInventory,
        matchedRows: payload.matchedRows
    })

    // 掃碼成功後，引導使用者下一步
    slotIdnoInput.value?.focus()
}

function convertProduceMode(s: boolean | null): ProduceTypeEnum | null {
    return s as unknown as ProduceTypeEnum
}

function convertBoardSide(s: String | null): BoardSideEnum | null {
    return s as unknown as BoardSideEnum
}

const { submit: submitPostProductionFeed } = usePostProductionFeed<RowModel>({
    gridApi,
    rowData,
    ui: {
        success: showSuccess,
        warn: showWarn,
        info: (msg: string) => message.info(msg),
        error: showError,
        notifyError: (msg: string) => message.error(msg),
        playErrorTone,
        resetSlotMaterialFormInputs,
    },
    getMounterData: () => mounterData.value,
    isTestingMode: () => isTestingMode.value,
    isProductionStarted: () => productionStarted.value,
    resetMaterialScan: handleSlotDone,
    inspectionUpload,
    appendedMaterialUpload,
})

function onProduction() {

    const invalid = rowData.value.filter(r => {
        if (r.correct === CheckMaterialMatchEnum.UNMATCHED_MATERIAL_PACK) return true
        if (!isTestingMode && r.correct == null) return true
        return false
    })
    if (invalid.length > 0) {
        return isTestingMode ?
            showError('尚有槽位不匹配，不能開始生產')
            : showError('尚有槽位未確認或不匹配，不能開始生產')
    }

    dialog.warning({
        title: '開始生產確認',
        content: '確定要開始生產嗎？',
        positiveText: '確定',
        negativeText: '取消',
        onPositiveClick: () => {
            // 真正開始生產的邏輯

            return startProductionUpload(isTestingMode.value)
        },
        onNegativeClick: () => {
            return
        }
    })
}

async function startProductionUpload(isTestingMode: boolean) {
    // 開始生產
    boardSide.value = convertBoardSide(String(route.query.work_sheet_side ?? null))
    switch (route.query.machine_side.toString().trim()) {
        case '1':
            machineSide.value = MachineSideEnum.FRONT
        case '2':
            machineSide.value = MachineSideEnum.BACK
        default:
            machineSide.value = null
    }

    try {
        const payload: Array<PanasonicMounterItemStatCreate> = rowData.value.map(row => ({
            operator_id: null,
            operation_time: new Date().toISOString(),
            production_start: new Date().toISOString(),
            work_order_no: String(route.params.workOrderIdno ?? null),
            product_idno: String(route.query.product_idno),
            machine_idno: String(route.params.mounterIdno.toString().trim()),
            machine_side: machineSide.value,
            board_side: boardSide.value,

            slot_idno: row.slotIdno,
            sub_slot_idno: row.subSlotIdno ?? null,
            material_idno: row.materialIdno ?? null,
            material_pack_code: row.materialInventoryIdno ?? null,
            produce_mode: convertProduceMode(isTestingMode ?? false),

            check_pack_code_match: row.correct
        }))

        console.log('Upload payload', payload)

        const response = await SmtService.addPanasonicMounterItemStats(
            { requestBody: payload }
        )

        showSuccess('開始生產，資料上傳成功')
        productionStarted.value = true

        router.replace({
            path: route.path,
            query: {
                ...route.query,
                // uuid: productionStatUuid.value
            }
        })


    } catch (err) {
        console.error('upload failed: ', err)
        showError('資料上傳失敗')
    }
}

function handleProductionStopped() {
    productionStarted.value = false
    showSuccess('生產已結束')

    router.push('/smt/panasonic-mounter/')
}

const rollTypeOptions = [{ label: '接料', value: 'roll' }, { label: '新捲料', value: 'new' }]

const rollShortageRules: FormRules = {
    materialInventoryIdno: { required: true, message: '請輸入單包條碼', trigger: ['blur'] },
    slotIdno: { required: true, message: '請輸入槽位', trigger: ['blur'] },
    type: {
        required: true, message: '請選擇接料類型', trigger: ['change']
    },
}

const {
    rollShortageFormRef,
    rollShortageFormValue,
    showRollShortageModal,
    onRollShortage,
    onSubmitShortage,
    getMaterialMatchedRows: getMaterialMatchedRowArray,
} = usePostProductionRollShortage<RowModel>({
    getMounterData: () => mounterData.value,
    getRowData: () => rowData.value,
    isTestingMode: () => isTestingMode.value,
})

const showMaterialQueryModal = ref(false)

async function onMaterialQuery() {
    //接料查詢
    showMaterialQueryModal.value = true
}

// VirtualKeyboard API does not work properly on Honeywell. 
function hideVirtualKeyboard() {
    // navigator.virtualKeyboard.overlaysContent = true
    // navigator.virtualKeyboard.hide()
}
</script>

<template>
    <!-- 單捲不足 Modal -->
    <n-modal v-model:show="showRollShortageModal" preset="dialog" title="單捲不足">
        <n-form :model="rollShortageFormValue" :rules="rollShortageRules" label-placement="top"
            ref="rollShortageFormRef">
            <n-form-item show-require-mark label="單包條碼" path="materialInventoryIdno">
                <n-input type="text" v-model:value.lazy="rollShortageFormValue.materialInventoryIdno"
                    placeholder="請輸入條碼"></n-input>
            </n-form-item>

            <n-form-item show-require-mark label="槽位" path="slotIdno">
                <n-input type="text" v-model:value.lazy="rollShortageFormValue.slotIdno" placeholder="請輸入槽位"></n-input>
            </n-form-item>

            <n-form-item show-require-mark label="接料類型" path="type">
                <n-radio-group v-model:value.lazy="rollShortageFormValue.type">
                    <n-radio-button v-for="rollType in rollTypeOptions" :key="rollType.value" :label="rollType.label"
                        :value="rollType.value"></n-radio-button>
                </n-radio-group>
            </n-form-item>
        </n-form>

        <template #action>
            <n-space>
                <n-button @click="showRollShortageModal = false">取消</n-button>
                <n-button type="primary" @click="onSubmitShortage">確定</n-button>
            </n-space>
        </template>
    </n-modal>
    <!-- 接料查詢 Modal -->
    <MaterialQueryModal v-model:show="showMaterialQueryModal" :uuid="productionUuid" @error="showError" />

    <n-space vertical :wrap-item="false" style="height: calc(100vh - 60px);">

        <n-space vertical size="small"
            style="padding: 0px 1rem 0 1rem; position: sticky; top: 0px; background-color: var(--table-color); z-index: 1;">
            <n-page-header @back=" onClickBackArrow($event)" style="margin-bottom: 1rem;">
                <!-- ✅ 機號 + 模式標籤 -->
                <template #title>
                    <div style="display: flex; align-items: center; gap: 8px; white-space: nowrap;">
                        <span>{{ route.params.mounterIdno }}</span>
                        <n-tag :type="isTestingMode === true ? 'warning' : 'success'" size="small" bordered>
                            {{ isTestingMode === true ? MODE_NAME_TESTING : MODE_NAME_NORMAL }}
                        </n-tag>
                    </div>
                </template>
                <template #default>
                    <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                        <!-- 左側：工單資訊 -->
                        <n-space size="small">
                            <n-p>
                                工單：<n-tag type="info" size="small">{{ workOrderIdno }}</n-tag>
                            </n-p>
                            <n-p>
                                成品料號：<n-tag type="info" size="small">{{ productIdno }}</n-tag>
                            </n-p>
                            <n-p>
                                工件面向：<n-tag type="info" size="small">{{ boardSide }}</n-tag>
                            </n-p>
                            <n-p>
                                機台面向：<n-tag type="info" size="small">{{ machineSide === MachineSideEnum.FRONT ? '1' :
                                    '2' }}</n-tag>
                            </n-p>
                        </n-space>

                        <!-- 右側：功能按鈕 -->
                        <n-space size="small">
                            <n-button v-if="!productionStarted" type="success" size="small" @click="onProduction"
                                :disabled="!productionStarted">
                                🚀 開始生產
                            </n-button>
                            <StopProductionButton v-else :uuid="productionUuid" @stopped="handleProductionStopped"
                                @error="showError" />
                            <n-button type="warning" size="small" @click="onRollShortage"
                                :disabled="!productionStarted">
                                ⚠️ 單捲不足
                            </n-button>
                            <n-button type="info" size="small" @click="onMaterialQuery">
                                🔍 接料查詢
                            </n-button>
                        </n-space>
                    </div>
                </template>
            </n-page-header>

            <n-grid cols="2 s:2" responsive="screen" x-gap="20">
                <n-gi>
                    <MaterialInventoryBarcodeInput :disabled="!productionStarted" :is-testing-mode="isTestingMode"
                        :get-material-matched-rows="getMaterialMatchedRowArray" @matched="handleMaterialMatched"
                        :reset-key="materialResetKey" @error="showError" />
                </n-gi>

                <n-gi>
                    <SlotIdnoInput :disabled="!productionStarted" :is-testing-mode="isTestingMode"
                        :has-material="!!postProductionFeedStore.materialResult" @submit="handleSlotSubmit" @error="showError"
                        @done="handleSlotDone" />
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
body {
    /* This does not work. */
    margin-block-end: env(keyboard-inset-height, 5000px);
}
</style>
