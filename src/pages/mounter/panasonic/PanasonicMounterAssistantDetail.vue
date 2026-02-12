<script setup lang="ts">

import "ag-grid-community/styles/ag-grid.css"; // Core grid CSS, always needed
import "ag-grid-community/styles/ag-theme-balham.css"; // Optional theme CSS
import { AgGridVue } from "ag-grid-vue3"; // the AG Grid Vue Component
import { InputInst, NForm, NFormItem, NGi, NGrid, NInput, NP, NPageHeader, NSpace, NTag, NButton, useDialog } from 'naive-ui';
import { ref, computed } from 'vue';
import { useMeta } from 'vue-meta';
import { useRoute, useRouter } from 'vue-router';
import {
    ApiError,
    CheckMaterialMatchEnum,
    PanasonicFeedRecordCreate,
    FeedMaterialTypeEnum,
    SmtService
} from '@/client';
import { useAuthStore } from '@/stores/authStore';
import { useUiNotifier } from '@/ui/shared/composables/useUiNotifier';

import MaterialInventoryBarcodeInput from "@/pages/components/MaterialInventoryBarcodeInput.vue";
import SlotIdnoInput from "@/pages/components/SlotIdnoInput.vue";
import StartProductionButton from "./components/StartProductionButton.vue";
import MaterialQueryModal from "./components/MaterialQueryModal.vue";

import type {
    ProductionRowModel,
    CorrectState,
    SmtMaterialInventoryEx
} from './types/production'
import { createProductionGridOptions } from '@/ui/pre-production/panasonic/createProductionGridOptions'
import { useSlotResultNotifier } from "@/ui/shared/composables/useSlotResultNotifier";
import { useProductionState } from '@/ui/pre-production/panasonic/useProductionState'
import { useRollShortageForm } from '@/ui/pre-production/panasonic/useRollShortageForm'
import { usePanasonicProductionData } from '@/ui/pre-production/panasonic/usePanasonicProductionData'
import { usePanasonicSlotFlow } from '@/ui/pre-production/panasonic/usePanasonicSlotFlow'
import { useProductionGridBinding } from '@/ui/pre-production/panasonic/useProductionGridBinding'
import { useSlotInputSelection } from '@/ui/shared/composables/useSlotInputSelection'
import { parsePanasonicSlotIdno } from '@/domain/slot/PanasonicSlotParser'


const route = useRoute();
const router = useRouter();
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




const slotIdnoInput = ref<{ focus: () => void; clear?: () => void } | null>(null);
const slotFormValue = ref({
    slotIdno: '',
    materialInventoryIdno: '',
    remark: '',   // ✅ 新增 remark
})
const materialFormValue = ref({ materialInventoryIdno: '' });
const materialInventoryIdnoInput = ref<InputInst>();

const startProductionBtnRef = ref<any>(null)
type ResultType = {
    success: boolean,
    materialInventory?: SmtMaterialInventoryEx | null,
    matchedRows?: any[]
}

const dialog = useDialog()
const { success: showSuccess, warn: showWarn, error: showError, info } = useUiNotifier()

useSlotResultNotifier({
    success: showSuccess,
    warn: showWarn,
    error: showError
})

const materialInventoryResult = ref<ResultType | null>(null)

function normalizeRouteValue(
    val: string | string[] | null | undefined
): string {
    if (Array.isArray(val)) return val[0] ?? ''
    return val ?? ''
}

const isTestingMode = route.query.testing_mode === '1'

const inputs = useSlotInputSelection<ResultType>({
    materialResult: materialInventoryResult,
    focusSlotInput: () => slotIdnoInput.value?.focus()
})

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


const { rowData } = usePanasonicProductionData()
const { onGridReady } = useProductionGridBinding({
    resetInputs: resetSlotSubmitInputs
})

const gridOptions = createProductionGridOptions(rowData)

function onClickBackArrow(event: Event) { router.push(`/smt/panasonic-mounter/`); }



function resetSlotMaterialFormInputs() {
    slotFormValue.value.slotIdno = ''
    slotFormValue.value.materialInventoryIdno = ''
    slotFormValue.value.remark = ''
    materialFormValue.value.materialInventoryIdno = ''
    materialInventoryIdnoInput.value?.focus()
}

function resetSlotSubmitInputs() {
    slotIdnoInput.value?.clear?.()
    resetSlotMaterialFormInputs()
    inputs.onSlotSubmitted()
}


function getMaterialMatchedRowArray(materialIdno: string): ProductionRowModel[] {
    return rowData.value.filter(row => 
        row.materialIdno === materialIdno &&
        (!row.materialInventoryIdno || row.correct !== 'true')
    )
}



function handleMaterialMatched(payload: {
    materialInventory: SmtMaterialInventoryEx
    matchedRows: any[]
}) {
    inputs.onMaterialMatched({
        success: true,
        materialInventory: payload.materialInventory,
        matchedRows: payload.matchedRows
    })
}


function convertMatch(s: CorrectState | null): CheckMaterialMatchEnum | null {
    return s as unknown as CheckMaterialMatchEnum
}


const {
    productionStarted,
    productionUuid,
    start: startProduction,
    stop: stopProduction
} = useProductionState()

const statMap = new Map<string, any>()

function handleProductionStarted(productionStatUuid: string) {
    // 1️⃣ 更新狀態
    startProduction(productionStatUuid)

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

async function onStopProduction() {
    dialog.warning({
        title: '結束生產確認',
        content: '確定要結束生產嗎？',
        positiveText: '確定',
        negativeText: '取消',
        onPositiveClick: async () => {
            await stopProduction()
            return showSuccess('生產已結束')
        },
        onNegativeClick: () => {
            return
        }
    })
}

const rollShortage = useRollShortageForm()
const rollTypeOptions = [
    { label: '接料', value: 'roll' },
    { label: '新捲料', value: 'new' }
]

function onRollShortage() {
    //單捲不足
    rollShortage.open()
}

function convertFeedMaterialType(s: string | null): FeedMaterialTypeEnum | null {
    return s as unknown as FeedMaterialTypeEnum
}

const { handleSlotSubmit: submitSlot } = usePanasonicSlotFlow({
    isTestingMode,
    getResult: () => materialInventoryResult.value,
    autoUpload: (rows) => {
        if (startProductionBtnRef.value) startProductionBtnRef.value.submit(rows)
    }
})

async function handleSlotSubmit(payload: { slotIdno: string; slot: string; subSlot: string }) {
    const success = await submitSlot(payload)
    if (success) {
        resetSlotSubmitInputs()
    }
    return success
}

async function onSubmitShortage() {
    // 可以先驗證表單
    const idno = rollShortage.formValue.value.materialInventoryIdno.trim()
    if (!idno) return showError('請輸入物料號')

    const inputSlotIdno = rollShortage.formValue.value.slotIdno.trim()
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
    const packType = rollShortage.formValue.value.type
    if (!packType) return showError('請選擇物料類型')

    let materialInventory: SmtMaterialInventoryEx | null = null

    const isTestingMode = route.query.testing_mode === '1'

    let correctState: CorrectState | null = null

    try {
        rollShortage.formRef.value?.validate()

        materialInventory = await SmtService.getMaterialInventoryForSmt({ materialInventoryIdno: idno })

        const materialMatchRowArray = getMaterialMatchedRowArray(materialInventory.material_idno)

        if (materialMatchRowArray.length === 0) {
            return showError('表格內無此物料')
        }

        correctState = 'true'

    } catch (error) {

        if (error instanceof ApiError && error.status === 404 && isTestingMode) {
            info(`${MODE_NAME_TESTING}：使用物料 [廠商測試新料] ${idno}`)
            correctState = 'warning'
        } else {
            if (error instanceof ApiError) {
                const msg = {
                    404: '查無此條碼',
                    504: 'ERP 連線超時，請確認 ERP 連線',
                    502: 'ERP 連線錯誤，請確認 ERP 連線',
                    500: '系統錯誤'
                }[error.status] ?? '未知錯誤'

                showError(msg)
            } else {
                console.error(error)
                showError('發生未知例外')
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
    await SmtService.addPanasonicMounterItemStatRoll(
        { requestBody: payload }
    )
    showSuccess("新增成功")

    const oldAppendedIdno = row.appendedMaterialInventoryIdno?.trim() || ""

    const newAppendedIdno = oldAppendedIdno ? `${oldAppendedIdno}, ${idno}` : idno

    materialRowNode.setDataValue('appendedMaterialInventoryIdno', newAppendedIdno)

    row.appendedMaterialInventoryIdno = newAppendedIdno

    rollShortage.close()
    rollShortage.formValue.value = { materialInventoryIdno: '', slotIdno: '', type: '' }
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
    <!-- 接料查詢 Modal -->
    <MaterialQueryModal v-model:show="showMaterialQueryModal" :uuid="productionUuid" @error="showError" />
    <n-space vertical :wrap-item="false" style="height: calc(100vh - 60px);">

        <n-space vertical size="small"
            style="padding: 0px 1rem 0 1rem; position: sticky; top: 0px; background-color: var(--table-color); z-index: 1;">
            <n-page-header @back=" onClickBackArrow($event)" style="margin-bottom: 1rem;">
                <!-- 機號 + 模式標籤 -->
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
                            <StartProductionButton ref="startProductionBtnRef" v-if="!productionStarted" :is-testing-mode="isTestingMode"
                                :row-data="rowData" :operator_id="currentUsername" :work-order-idno="workOrderIdno" :product-idno="productIdno"
                                :mounter-idno="mounterIdno" :machine-side-query="machineSideQuery"
                                :work-sheet-side-query="workSheetSideQuery" @started="handleProductionStarted"
                                @error="showError" />
                            <n-button v-else type="error" size="small" @click="onStopProduction">
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
                        :reset-key="inputs.resetKey.value" @error="showError" />
                </n-gi>

                <n-gi>
                        <SlotIdnoInput :is-testing-mode="isTestingMode" :has-material="inputs.hasMaterial.value"
                        :parse-slot-idno="parsePanasonicSlotIdno" :reset-key="inputs.slotResetKey.value" ref="slotIdnoInput"
                        :key="inputs.slotResetKey.value" @submit="handleSlotSubmit" @error="showError" />
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
