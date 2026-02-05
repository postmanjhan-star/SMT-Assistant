<script setup lang="ts">

import { GetRowIdParams, GridOptions, RowNode } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css"; // Core grid CSS, always needed
import "ag-grid-community/styles/ag-theme-balham.css"; // Optional theme CSS
import { AgGridVue } from "ag-grid-vue3"; // the AG Grid Vue Component
import { InputInst, NForm, NFormItem, NGi, NGrid, NInput, NP, NPageHeader, NSpace, NTag, useMessage, NModal, NRadioGroup, NRadioButton, NButton, FormInst, FormRules, useDialog } from 'naive-ui';
import * as Tone from 'tone';
import { onMounted, ref } from 'vue';
import { useMeta } from 'vue-meta';
import { useRoute, useRouter } from 'vue-router';
import {
    ApiError,
    CheckMaterialMatchEnum,
    $ProduceTypeEnum,
    PanasonicMounterFileRead,
    PanasonicMounterItemStatCreate,
    PanasonicMounterItemStatRead,
    PanasonicFeedRecordCreate,
    PanasonicItemStatFeedLogRead,
    ProduceTypeEnum,
    FeedMaterialTypeEnum,
    SmtMaterialInventory,
    SmtService,
    BoardSideEnum,
    MachineSideEnum,
    MaterialTypeEnum
} from '@/client';

import MaterialQueryModal from "./components/MaterialQueryModal.vue";
import StopProductionButton from "./components/StopProductionButton.vue";
import MaterialInventoryBarcodeInput from "./components/MaterialInventoryBarcodeInput.vue";
import SlotIdnoInput from "./components/SlotIdnoInput.vue";
import { PostProductionFeedUseCase } from "@/application/post-production-feed/PostProductionFeedUseCase";

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
const correctState = ref<CorrectState>('false')

const mounterData = ref<PanasonicMounterItemStatRead[]>([]);
type SmtMaterialInventoryEx = SmtMaterialInventory & { remark?: string }
const slotIdnoInput = ref<InputInst>();
const slotFormValue = ref({
    slotIdno: '',
    materialInventoryIdno: '',
    remark: '',   // ✅ 新增 remark
})
const materialFormValue = ref({ materialInventoryIdno: '' });
const materialInventoryIdnoInput = ref<InputInst>();

type ResultType = {
    success: boolean,
    materialInventory?: SmtMaterialInventoryEx | null,
    matchedRows?: any[]
}

const dialog = useDialog()

const materialInventoryResult = ref<ResultType | null>(null)

type CorrectState = 'true' | 'false' | 'warning'

type RowModel = {
    correct: CheckMaterialMatchEnum | null,
    id: number,
    slotIdno: string,
    subSlotIdno: string,
    firstAppendTime?: string | null,
    materialIdno: string,
    materialInventoryIdno: string | null,
    appendedMaterialInventoryIdno: string,
    remark?: string,
    inspectTime?: string | null,
    inspectMaterialPackCode?: string | null,
    inspectCount?: number | null
}

const rowData = ref<RowModel[]>([]);

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
        mounterData.value = await SmtService.getThePanasonicItemStatsOfProduction({ uuid: productionUuid.value })
        workOrderIdno.value = mounterData.value[0].work_order_no
        productIdno.value = mounterData.value[0].product_idno
        machineSide.value = mounterData.value[0].machine_side
        boardSide.value = mounterData.value[0].board_side
        testingMode.value = mounterData.value[0].produce_mode
        isTestingMode.value = testingMode.value === ProduceTypeEnum.TESTING_PRODUCE_MODE ? true : false

        if (mounterData.value[0].production_end == null) {
            productionStarted.value = true
        }
    }
    catch (error) {
        if (error instanceof ApiError && error.status === 404) { router.push('/http-status/404') }
        else if (error instanceof ApiError && error.status === 503) { router.push('/http-status/404') }
    }

    let logs: any[] = [];
    try {
        logs = await SmtService.getTheStatsOfLogsByUuid({ uuid: productionUuid.value });
    } catch (e) {
        console.error("Failed to fetch logs", e);
    }

    const newRowData: RowModel[] = []
    for (let materialSlotPair of mounterData.value) {

        let feedRecords = (materialSlotPair.feed_records as any[]) || [];
        if (logs.length > 0) {
            const matchingLogs = logs.filter(l =>
                String(l.slot_idno) === String(materialSlotPair.slot_idno) &&
                (l.sub_slot_idno ?? '') === (materialSlotPair.sub_slot_idno ?? '')
            );
            const recordMap = new Map();
            feedRecords.forEach((r: any) => recordMap.set(r.id, r));
            matchingLogs.forEach((l: any) => recordMap.set(l.id, l));
            feedRecords = Array.from(recordMap.values());
        }

        const inspectionRecords = feedRecords.filter(
            (r: any) => r.feed_material_pack_type === FeedMaterialTypeEnum.INSPECTION_MATERIAL_PACK
        )

        const inspectionCount = inspectionRecords?.length ?? 0

        const latestInspection = inspectionRecords
            ?.sort((a: any, b: any) =>
                new Date(b.operation_time).getTime() - new Date(a.operation_time).getTime()
            )[0]
        const importMaterialPack = feedRecords.find((record: any) => record.feed_material_pack_type === FeedMaterialTypeEnum.IMPORTED_MATERIAL_PACK)
        const feedMaterialPacks = feedRecords.filter(
            (record: any) =>
                record.feed_material_pack_type === FeedMaterialTypeEnum.REUSED_MATERIAL_PACK ||
                record.feed_material_pack_type === FeedMaterialTypeEnum.NEW_MATERIAL_PACK
        )
        const appendedCodes = [...new Set(feedMaterialPacks.map((pack: any) => pack.material_pack_code).filter((code: any) => !!code))].join(', ')

        newRowData.push({
            correct: importMaterialPack?.check_pack_code_match,
            inspectMaterialPackCode: latestInspection?.material_pack_code ?? '',
            inspectTime: latestInspection?.operation_time ?? null,
            id: materialSlotPair.id,
            slotIdno: materialSlotPair.slot_idno,
            subSlotIdno: materialSlotPair.sub_slot_idno,
            firstAppendTime: importMaterialPack?.operation_time ?? feedRecords?.[0]?.operation_time,
            materialIdno: materialSlotPair.material_idno,
            appendedMaterialInventoryIdno: appendedCodes,
            materialInventoryIdno: importMaterialPack?.material_pack_code,
            inspectCount: inspectionCount,
            remark: inspectionCount > 0 ? `巡檢 ${inspectionCount} 次` : ''
        })
    }

    rowData.value = newRowData
})

const materialResetKey = ref(0)

function handleSlotDone() {
    // 清掉這一輪狀態
    materialInventoryResult.value = null

    // 🔑 觸發 MaterialInput reset
    materialResetKey.value++
}

function clearMaterialResult() {
    materialInventoryResult.value = null
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
    return postProductionFeed.execute({
        slot,
        subSlot,
        slotIdno,
        result: materialInventoryResult.value,
    })
}

async function inspectionUpload(params: {
    stat_id: number
    inputSlot: string
    inputSubSlot: string
    materialInventory: SmtMaterialInventoryEx
}) {
    const payload = {
        stat_item_id: params.stat_id,
        operator_id: '',
        operation_time: new Date().toISOString(),
        slot_idno: params.inputSlot,
        sub_slot_idno: params.inputSubSlot ?? null,
        material_pack_code: params.materialInventory.idno,
        feed_material_pack_type: convertFeedMaterialType('inspect'),
        check_pack_code_match: convertMatch('true')
    }
    console.log("巡檢上傳資料", payload)
    await SmtService.addPanasonicMounterItemStatRoll({
        requestBody: payload
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


function getMaterialMatchedRowArray(materialIdno: string): RowModel[] {
    return rowData.value.filter(row => row.materialIdno === materialIdno)
}

function handleMaterialMatched(payload: {
    materialInventory: SmtMaterialInventoryEx
    matchedRows: any[]
}) {
    materialInventoryResult.value = {
        success: true,
        materialInventory: payload.materialInventory,
        matchedRows: payload.matchedRows
    }

    // 掃碼成功後，引導使用者下一步
    slotIdnoInput.value?.focus()
}

function convertMatch(s: CorrectState | null): CheckMaterialMatchEnum | null {
    return s as unknown as CheckMaterialMatchEnum
}

function convertProduceMode(s: boolean | null): ProduceTypeEnum | null {
    return s as unknown as ProduceTypeEnum
}

function convertBoardSide(s: String | null): BoardSideEnum | null {
    return s as unknown as BoardSideEnum
}



async function appendedMaterialUpload(params: {
    stat_id: number,
    inputSlot: string,
    inputSubSlot: string,
    materialInventory?: SmtMaterialInventoryEx | null,
    correctState?: CorrectState
}) {

    const payload: PanasonicFeedRecordCreate = {
        stat_item_id: params.stat_id,
        operator_id: '',
        operation_time: new Date().toISOString(),
        slot_idno: params.inputSlot,
        sub_slot_idno: params.inputSubSlot ?? null,
        material_pack_code: params.materialInventory.idno,
        feed_material_pack_type: convertFeedMaterialType('new'),
        check_pack_code_match: convertMatch(params.correctState)
    }

    const response = await SmtService.addPanasonicMounterItemStatRoll(
        { requestBody: payload }
    )
}

const productionStarted = ref(false)

const postProductionFeed = new PostProductionFeedUseCase({
    getGridApi: () => gridOptions.api,
    getRowData: () => rowData.value,
    getMounterData: () => mounterData.value,
    isTestingMode: () => isTestingMode.value,
    isProductionStarted: () => productionStarted.value,
    getCorrectState: () => correctState.value,
    setCorrectState: (state) => {
        correctState.value = state
    },
    clearMaterialResult,
    resetMaterialScan: handleSlotDone,
    showSuccess,
    showWarn,
    showError,
    notifyError: (msg: string) => message.error(msg),
    playErrorTone,
    resetSlotMaterialFormInputs,
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

const rollShortageFormRef = ref<FormInst | null>(null)
const showRollShortageModal = ref(false)
const rollTypeOptions = [{ label: '接料', value: 'roll' }, { label: '新捲料', value: 'new' }]

const rollShortageFormValue = ref({
    materialInventoryIdno: '',
    slotIdno: '',
    type: ''
})

const rollShortageRules: FormRules = {
    materialInventoryIdno: { required: true, message: '請輸入單包條碼', trigger: ['blur'] },
    slotIdno: { required: true, message: '請輸入槽位', trigger: ['blur'] },
    type: {
        required: true, message: '請選擇接料類型', trigger: ['change']
    },
}

function onRollShortage() {
    //單捲不足
    showRollShortageModal.value = true
}

function convertFeedMaterialType(s: string | null): FeedMaterialTypeEnum | null {
    return s as unknown as FeedMaterialTypeEnum
}




async function onSubmitShortage() {
    // 可以先驗證表單
    const idno = rollShortageFormValue.value.materialInventoryIdno.trim()
    if (!idno) return showError('請輸入物料號')

    const inputSlotIdno = rollShortageFormValue.value.slotIdno.trim()
    if (!inputSlotIdno) return showError('請輸入槽位')
    const [inputSlot, inputSubSlot = ''] = inputSlotIdno.split('-')

    const stat = mounterData.value.find(
        stat => stat.slot_idno === inputSlot && (stat.sub_slot_idno ?? '') === inputSubSlot
    )

    if (!stat) return showError('找不到對應的槽位的資料')

    const row = rowData.value.find(
        r => r.slotIdno === inputSlot && (r.subSlotIdno ?? '') === inputSubSlot
    )

    if (!row) {
        return showError(`找不到表格槽位 ${inputSlotIdno}`)
    }

    const rowId = `${row.slotIdno}-${row.subSlotIdno ?? ''}`

    const materialRowNode = gridOptions.api.getRowNode(rowId)
    if (!materialRowNode) {
        return showError(`找不到AG Grid 資料列 ${rowId}`)
    }
    const packType = rollShortageFormValue.value.type
    if (!packType) return showError('請選擇物料類型')

    let materialInventory: SmtMaterialInventoryEx | null = null

    let correctState: CorrectState | null = null

    try {
        rollShortageFormRef.value?.validate()


        materialInventory = await SmtService.getMaterialInventoryForSmt({ materialInventoryIdno: idno })

        const materialMatchRowArray = getMaterialMatchedRowArray(materialInventory.material_idno)

        if (materialMatchRowArray.length === 0) {
            await playErrorTone()
            return showError('表格內無此物料')
        }

        correctState = 'true'

    } catch (error) {

        if (error instanceof ApiError && error.status === 404 && isTestingMode) {
            message.info(`${MODE_NAME_TESTING}：使用物料 [廠商測試新料] ${idno}`)
            correctState = 'warning'
        } else {
            if (error instanceof ApiError) {
                const msg = {
                    404: '查無此條碼',
                    504: 'ERP 連線超時，請確認 ERP 連線',
                    502: 'ERP 連線錯誤，請確認 ERP 連線',
                    500: '系統錯誤'
                }[error.status] ?? '未知錯誤'

                message.error(msg)
            } else {
                console.error(error)
                message.error('發生未知例外')
            }
            return null
        }
    }

    const payload: PanasonicFeedRecordCreate = {
        stat_item_id: stat.id,
        operator_id: '',
        operation_time: new Date().toISOString(),
        slot_idno: inputSlot,
        sub_slot_idno: inputSubSlot ?? null,
        material_pack_code: idno,
        feed_material_pack_type: convertFeedMaterialType(packType),
        check_pack_code_match: convertMatch(correctState)
    }
    console.log("送出資料", payload)
    const response = await SmtService.addPanasonicMounterItemStatRoll(
        { requestBody: payload }
    )
    showSuccess("新增成功")

    const oldAppendedIdno = row.appendedMaterialInventoryIdno?.trim() || ""

    const currentCodes = oldAppendedIdno ? oldAppendedIdno.split(',').map(s => s.trim()) : []
    if (idno && !currentCodes.includes(idno)) {
        currentCodes.push(idno)
    }
    const newAppendedIdno = currentCodes.join(', ')

    materialRowNode.setDataValue('appendedMaterialInventoryIdno', newAppendedIdno)

    row.appendedMaterialInventoryIdno = newAppendedIdno

    showRollShortageModal.value = false
    rollShortageFormValue.value = { materialInventoryIdno: '', slotIdno: '', type: '' }

}

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
                        :has-material="!!materialInventoryResult" @submit="handleSlotSubmit" @error="showError"
                        @done="handleSlotDone" />
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
body {
    /* This does not work. */
    margin-block-end: env(keyboard-inset-height, 5000px);
}
</style>
