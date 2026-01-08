<script setup lang="ts">

import { GetRowIdParams, GridOptions, RowNode } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css"; // Core grid CSS, always needed
import "ag-grid-community/styles/ag-theme-balham.css"; // Optional theme CSS
import { AgGridVue } from "ag-grid-vue3"; // the AG Grid Vue Component
import { InputInst, NForm, NFormItem, NGi, NGrid, NInput, NP, NPageHeader, NSpace, NTag, useMessage, NModal, NRadioGroup, NRadioButton, NButton, FormInst, FormRules, useDialog } from 'naive-ui';
import * as Tone from 'tone';
import { onMounted, ref, computed } from 'vue';
import { useMeta } from 'vue-meta';
import { useRoute, useRouter } from 'vue-router';
import {
    ApiError,
    CheckMaterialMatchEnum,
    PanasonicMounterFileRead,
    PanasonicMounterItemStatCreate,
    PanasonicFeedRecordCreate,
    PanasonicItemStatFeedLogRead,
    ProduceTypeEnum,
    BoardSideEnum,
    MachineSideEnum,
    FeedMaterialTypeEnum,
    SmtMaterialInventory,
    SmtService
} from '@/client';
import { useAuthStore } from '@/stores/authStore';
import { CloudCog } from "lucide-vue-next";

import MaterialInventoryBarcodeInput from "./components/MaterialInventoryBarcodeInput.vue";
import SlotIdnoInput from "./components/SlotIdnoInput.vue";
import StartProductionButton from "./components/StartProductionButton.vue";
import MaterialQueryModal from "./components/MaterialQueryModal.vue";

import { useDateFormatter } from '@/composables/useDateFormatter'

const { format } = useDateFormatter()

const route = useRoute();
const router = useRouter();
const message = useMessage();
useMeta({ title: 'Panasonic Mounter Assistant' });

const MODE_NAME_TESTING = '🧪 試產生產模式'
const MODE_NAME_NORMAL = '✅ 正式生產模式'

const authStore = useAuthStore();
// 從 Store 取得使用者名稱 (Store 已與 localStorage 同步)
const currentUsername = computed(() =>
    authStore.authState.OAuth2PasswordBearer?.username ??
    authStore.authState.HTTPBasic?.value?.username ??
    ''
);




const mounterData = ref<PanasonicMounterFileRead>();
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

function normalizeRouteValue(
    val: string | string[] | null | undefined
): string {
    if (Array.isArray(val)) return val[0] ?? ''
    return val ?? ''
}

type CorrectState = 'true' | 'false' | 'warning'

type RowModel = {
    correct: CorrectState | null,
    id: number,
    slotIdno: string,
    subSlotIdno: string,
    firstAppendTime?: string | null,
    materialIdno: string,
    materialInventoryIdno: string,
    appendedMaterialInventoryIdno: string,
    remark?: string,
}

const isTestingMode = route.query.testing_mode === '1'

const materialResetKey = ref(0)

const workOrderIdno = computed(() =>
    normalizeRouteValue(route.params.workOrderIdno as any)
)

const productIdno = computed(() =>
    normalizeRouteValue(route.query.product_idno)
)

const mounterIdno = computed(() =>
    normalizeRouteValue(route.params.mounterIdno as any)
)

const machineSideQuery = computed(() =>
    normalizeRouteValue(route.query.machine_side)
)

const workSheetSideQuery = computed(() =>
    normalizeRouteValue(route.query.work_sheet_side)
)


function handleSlotDone() {
    // 清掉這一輪狀態
    materialInventoryResult.value = null

    // 🔑 觸發 MaterialInput reset
    materialResetKey.value++
}

const rowData = ref<RowModel[]>([]);

const gridOptions: GridOptions = {
    // PROPERTIES
    // Column Definitions
    columnDefs: [
        { field: "correct", tooltipField: 'correct', headerName: '', flex: 1, minWidth: 60, refData: { 'true': '✅', 'false': '❌', 'warning': '⚠️' } },
        { field: "slotIdno", tooltipField: 'slotIdno', headerName: '槽位', flex: 3, minWidth: 90 },
        { field: "subSlotIdno", tooltipField: 'subSlotIdno', headerName: '子槽位', flex: 2, minWidth: 100 },
        { field: "firstAppendTime", tooltipField: 'firstAppendTime', headerName: '上料時間', flex: 3, minWidth: 140 , valueFormatter: (p) => format(p.value)},
        { field: "materialIdno", tooltipField: 'materialIdno', headerName: '物料號', flex: 4, minWidth: 140 },
        { field: "materialInventoryIdno", tooltipField: 'materialInventoryIdno', headerName: '單包代碼', flex: 5, minWidth: 140 },
        { field: "appendedMaterialInventoryIdno", tooltipField: 'appendedMaterialInventoryIdno', headerName: '接料代碼', flex: 5, minWidth: 140 },
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
        console.log(currentUsername.value)

        mounterData.value = await SmtService.getPanasonicMounterMaterialSlotPairs({
            workOrderIdno: route.params.workOrderIdno.toString().trim(),
            mounterIdno: route.params.mounterIdno.toString().trim(),
            productIdno: route.query.product_idno.toString().trim(),
            boardSide: route.query.work_sheet_side.toString() as 'TOP' | 'BOTTOM' | 'DUPLEX',
            machineSide: route.query.machine_side.toString() as '1' | '2', // 1 = front, 2 = back

            // For testing and debugging. Example: http://127.0.0.1/smt/panasonic-mounter/A1-NPM-W2/H0001?work_sheet_side=DUPLEX&machine_side=1&testing_mode=1&testing_product_idno=40X76-002A-T3
            testingMode: route.query.testing_mode === '1' ? true : false,
            testingProductIdno: route.query.testing_product_idno ? route.query.testing_product_idno.toString() : null,
        })
    }
    catch (error) {
        if (error instanceof ApiError && error.status === 404) { router.push('/http-status/404') }
        else if (error instanceof ApiError && error.status === 503) { router.push('/http-status/404') }
    }

    const newRowData: RowModel[] = []
    for (let materialSlotPair of mounterData.value.panasonic_mounter_file_items) {
        newRowData.push({
            correct: null,
            id: materialSlotPair.id,
            slotIdno: materialSlotPair.slot_idno,
            subSlotIdno: materialSlotPair.sub_slot_idno,
            firstAppendTime: null,
            materialIdno: materialSlotPair.smd_model_idno,
            appendedMaterialInventoryIdno: '',
            materialInventoryIdno: '',
        })
    }

    rowData.value = newRowData
})



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


function cleanErrorMaterialInventory(currentPackCode: string, inputSlot: string, inputSubSlot: string) {
    if (!currentPackCode) return
    gridOptions.api.forEachNode((node) => {
        const isSame = node.data.materialInventoryIdno === currentPackCode
        const isDifferentSlot = `${node.data.slotIdno}-${node.data.subSlotIdno}` !== `${inputSlot}-${inputSubSlot}`
    const isCorrect = node.data.correct === 'true'

    if (isSame && isDifferentSlot && !isCorrect) {
            node.setDataValue('materialInventoryIdno', '')
            node.setDataValue('correct', '')
            node.setDataValue('remark', '')
            node.setDataValue('firstAppendTime', null)
        }
    })
}


async function handleMistmatch(result: any, inputSlot: string, inputSubSlot: string, materialRowNode: any) {
    const inputSlotIdno = `${inputSlot}-${inputSubSlot}`
    const newRow = {
        slotIdno: inputSlot,
        subSlotIdno: inputSubSlot,
        correct: 'false' as CorrectState,
        materialInventoryIdno: result.materialInventory?.idno ?? '',
        remark: ''
    }

    const existingNode = gridOptions.api.getRowNode(inputSlotIdno)
    existingNode?.setDataValue('correct', newRow.correct)
    existingNode?.setDataValue('materialInventoryIdno', newRow.materialInventoryIdno)

    materialRowNode.setSelected(false)

    await playErrorTone()
    message.error(`錯誤的槽位 ${inputSlotIdno}`)
    resetSlotMaterialFormInputs()

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

async function handleNormalMode(result: ResultType, inputSlot: string, inputSubSlot: string, inputSlotIdno: string) {
    if (!result) return showWarn('請先掃描物料條碼')

    const matchedRows = result.matchedRows || []
    if (matchedRows.length === 0) return showWarn('此物料未匹配任何槽位')

    const targetRow = matchedRows.find(row => row.slotIdno === inputSlot && (row.subSlotIdno ?? '') === inputSubSlot)

    if (targetRow) {
        const rowNode = gridOptions.api.getRowNode(`${targetRow.slotIdno}-${targetRow.subSlotIdno}`)

        if (!rowNode) return await showError(`找不到物料槽位 ${inputSlotIdno}`)

        cleanErrorMaterialInventory(result.materialInventory?.idno, inputSlot, inputSubSlot)

        rowNode.setDataValue('remark', result.materialInventory?.idno ?? '')
        rowNode.setDataValue('materialInventoryIdno', result.materialInventory?.remark ?? '')
        rowNode.setDataValue('correct', 'true')
        rowNode.setDataValue('firstAppendTime', new Date().toISOString())
        resetSlotMaterialFormInputs()
        materialInventoryResult.value = null

        return await showSuccess(`${MODE_NAME_NORMAL}：槽位 ${inputSlotIdno} 綁定成功`)
    } else {
        const firstRow = matchedRows[0]
        const rowNode = gridOptions.api.getRowNode(`${firstRow.slotIdno}-${firstRow.subSlotIdno}`)
        await handleMistmatch(result, inputSlot, inputSubSlot, rowNode)
        materialInventoryResult.value = null
        return false
    }
}

async function handleTestingMode(result: ResultType, inputSlot: string, inputSubSlot: string, inputSlotIdno: string) {
    if (!result) return showWarn('請先掃描物料條碼')

    const matchedRows = result.matchedRows || []
    const rowNode = gridOptions.api.getRowNode(`${inputSlot}-${inputSubSlot}`)

    if (!rowNode) return await showError(`找不到的輸入槽位 ${inputSlotIdno}`)

    if (matchedRows.length !== 0) {
        const targetRow = matchedRows.find(row => row.slotIdno === inputSlot && (row.subSlotIdno ?? '') === inputSubSlot)

        if (targetRow) {
            const materialRowNode = gridOptions.api.getRowNode(`${targetRow.slotIdno}-${targetRow.subSlotIdno}`)

            if (!materialRowNode) return await showError(`找不到物料槽位 ${inputSlotIdno}`)

            cleanErrorMaterialInventory(result.materialInventory?.idno, inputSlot, inputSubSlot)

            rowNode.setDataValue('materialInventoryIdno', result.materialInventory?.idno ?? '')
            rowNode.setDataValue('remark', result.materialInventory?.remark ?? '')
            rowNode.setDataValue('correct', 'true')
            rowNode.setDataValue('firstAppendTime', new Date().toISOString())

            resetSlotMaterialFormInputs()
            materialInventoryResult.value = null

            return await showSuccess(`${MODE_NAME_TESTING}：槽位 ${inputSlotIdno} 綁定成功`)
        } else {
            const firstRow = matchedRows[0]
            const materialRowNode = gridOptions.api.getRowNode(`${firstRow.slotIdno}-${firstRow.subSlotIdno}`)
            await handleMistmatch(result, inputSlot, inputSubSlot, materialRowNode)
            materialInventoryResult.value = null
            return false
        }
    }

    const testRemark = '[廠商測試新料]'
    rowNode.setDataValue('correct', 'warning')
    rowNode.setDataValue('remark', testRemark)
    rowNode.setDataValue('materialInventoryIdno', result.materialInventory?.idno ?? '')
    rowNode.setDataValue('firstAppendTime', new Date().toISOString())
    materialInventoryResult.value = null

    await showSuccess(`${MODE_NAME_TESTING}：槽位 ${inputSlotIdno} 已標記為 ${testRemark}`)
    resetSlotMaterialFormInputs()

    console.log(rowData.value)
    return true
}


function convertMatch(s: CorrectState | null): CheckMaterialMatchEnum | null {
    return s as unknown as CheckMaterialMatchEnum
}



const productionStarted = ref(false)

const statMap = new Map<string, any>()
const productionStatUuidRef = ref<string>('')

function handleProductionStarted(productionStatUuid: string) {

    // 1️⃣ 更新狀態
    productionStarted.value = true
    productionStatUuidRef.value = productionStatUuid

    // 2️⃣ 更新 URL（保留 query）
    router.replace({
        path: route.path,
        query: {
            ...route.query,
            uuid: productionStatUuid
        }
    })

    // 3️⃣ 導向 UUID 頁（你已經設好的路由）
    router.push(`/smt/panasonic-mounter-production/${productionStatUuid}`)
}

async function stopProduction() {
    // 結束生產
    const firstStat = statMap.values().next().value

    dialog.warning({
        title: '結束生產確認',
        content: '確定要結束生產嗎？',
        positiveText: '確定',
        negativeText: '取消',
        onPositiveClick: () => {
            productionStarted.value = false
            uploadEndProductionTime(firstStat.uuid)
            return showSuccess('生產已結束')
        },
        onNegativeClick: () => {
            return
        }
    })
}

async function uploadEndProductionTime(uuid: string) {
    await SmtService.updateTheStatsOfProductionEndTimeRecord({
        uuid: uuid,
        endTime: new Date().toISOString()
    })
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


async function handleSlotSubmit({
    slot,
    subSlot,
    slotIdno
}: {
    slot: string
    subSlot: string
    slotIdno: string
}) {
    const result = materialInventoryResult.value

    if (isTestingMode) {
        return await handleTestingMode(result, slot, subSlot, slotIdno)
    } else {
        return await handleNormalMode(result, slot, subSlot, slotIdno)
    }
}


async function onSubmitShortage() {
    // 可以先驗證表單
    const idno = rollShortageFormValue.value.materialInventoryIdno.trim()
    if (!idno) return showError('請輸入物料號')

    const inputSlotIdno = rollShortageFormValue.value.slotIdno.trim()
    if (!inputSlotIdno) return showError('請輸入槽位')
    const stat = statMap.get(inputSlotIdno)
    const [inputSlot, inputSubSlot = ''] = inputSlotIdno.split('-')
    if (!stat) return showError('找不到對應的槽位')

    const row = rowData.value.find(
        r => r.slotIdno === inputSlot && (r.subSlotIdno ?? '') === inputSubSlot
    )  

    if (!row) {
        return showError(`找不到槽位 ${inputSlotIdno}`)
    }

    const rowId = `${row.slotIdno}-${row.subSlotIdno ?? ''}`

    const materialRowNode = gridOptions.api.getRowNode(rowId)
    if (!materialRowNode) {
        return showError(`找不到AG Grid 資料列 ${rowId}`)
    }
    const packType = rollShortageFormValue.value.type
    if (!packType) return showError('請選擇物料類型')

    let materialInventory: SmtMaterialInventoryEx | null = null

    const isTestingMode = route.query.testing_mode === '1'

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
        operator_id: currentUsername.value || null,
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

    const newAppendedIdno = oldAppendedIdno ? `${oldAppendedIdno}, ${idno}` : idno

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
    <MaterialQueryModal v-model:show="showMaterialQueryModal" :uuid="productionStatUuidRef" @error="showError" />
    <n-space vertical :wrap-item="false" style="height: calc(100vh - 60px);">

        <n-space vertical size="small"
            style="padding: 0px 1rem 0 1rem; position: sticky; top: 0px; background-color: var(--table-color); z-index: 1;">
            <n-page-header @back=" onClickBackArrow($event)" style="margin-bottom: 1rem;">
                <!-- ✅ 機號 + 模式標籤 -->
                <template #title>
                    <div style="display: flex; align-items: center; gap: 8px; white-space: nowrap;">
                        <span>{{ route.params.mounterIdno }}</span>
                        <n-tag :type="route.query.testing_mode === '1' ? 'warning' : 'success'" size="small" bordered>
                            {{ route.query.testing_mode === '1' ? MODE_NAME_TESTING : MODE_NAME_NORMAL }}
                        </n-tag>
                    </div>
                </template>
                <template #default>
                    <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                        <!-- 左側：工單資訊 -->
                        <n-space size="small">
                            <n-p>
                                工單：<n-tag type="info" size="small">{{ route.params.workOrderIdno }}</n-tag>
                            </n-p>
                            <n-p>
                                成品料號：<n-tag type="info" size="small">{{ route.query.product_idno }}</n-tag>
                            </n-p>
                            <n-p>
                                工件面向：<n-tag type="info" size="small">{{ route.query.work_sheet_side }}</n-tag>
                            </n-p>
                            <n-p>
                                機台面向：<n-tag type="info" size="small">{{ route.query.machine_side }}</n-tag>
                            </n-p>
                        </n-space>

                        <!-- 右側：功能按鈕 -->
                        <n-space size="small">
                            <StartProductionButton v-if="!productionStarted" :is-testing-mode="isTestingMode"
                                :row-data="rowData" :operator_id="currentUsername" :work-order-idno="workOrderIdno" :product-idno="productIdno"
                                :mounter-idno="mounterIdno" :machine-side-query="machineSideQuery"
                                :work-sheet-side-query="workSheetSideQuery" @started="handleProductionStarted"
                                @error="showError" />
                            <n-button v-else type="error" size="small" @click="stopProduction">
                                🛑 結束生產
                            </n-button>
                            <n-button type="warning" size="small" @click="onRollShortage"
                                :disabled="!productionStarted">
                                ⚠️ 單捲不足
                            </n-button>
                            <n-button type="info" size="small" @click="onMaterialQuery" :disabled="!productionStarted">
                                🔍 接料查詢
                            </n-button>
                        </n-space>
                    </div>
                </template>
            </n-page-header>

            <n-grid cols="2 s:2" responsive="screen" x-gap="20">
                <n-gi>
                    <MaterialInventoryBarcodeInput :is-testing-mode="isTestingMode"
                        :get-material-matched-rows="getMaterialMatchedRowArray" @matched="handleMaterialMatched"
                        :reset-key="materialResetKey" @error="showError" />
                </n-gi>

                <n-gi>
                    <SlotIdnoInput :is-testing-mode="isTestingMode" :has-material="!!materialInventoryResult"
                        @submit="handleSlotSubmit" @error="showError" @done="handleSlotDone" />
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
