<script setup lang="ts">
import { GetRowIdParams, GridOptions } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-balham.css";
import { AgGridVue } from "ag-grid-vue3";
import { NButton, NP, NPageHeader, NSpace, NTag, useDialog, useMessage } from 'naive-ui';
import * as Tone from 'tone';
import { onMounted, ref } from 'vue';
import { useMeta } from 'vue-meta';
import { useRoute, useRouter } from 'vue-router';
import {
    ApiError,
    BoardSideEnum,
    CheckMaterialMatchEnum,
    FujiMounterItemStatRead,
    ProduceTypeEnum,
    FeedMaterialTypeEnum,
    SmtService,
    SmtMaterialInventory
} from '@/client';

const route = useRoute();
const router = useRouter();
const message = useMessage();
const dialog = useDialog();
useMeta({ title: 'Fuji Mounter Production' });

const MODE_NAME_TESTING = '🧪 試產生產模式';
const MODE_NAME_NORMAL = '✅ 正式生產模式';

const workOrderIdno = ref<string>('');
const productIdno = ref<string>('');
const mounterIdno = ref<string>('');
const boardSide = ref<BoardSideEnum | null>(null);
const isTestingMode = ref<boolean>(false);
const productionUuid = ref<string>('');
const productionStarted = ref(false);

const mounterData = ref<FujiMounterItemStatRead[]>([]);

type RowModel = {
    correct: CheckMaterialMatchEnum | null;
    id: number;
    mounterIdno: string;
    boardSide: string;
    stage: string;
    slot: number;
    materialIdno: string;
    materialInventoryIdno: string | null;
    remark?: string;
    operationTime?: string | null;
};

const rowData = ref<RowModel[]>([]);

const gridOptions: GridOptions = {
    columnDefs: [
        { field: "correct", headerName: '', flex: 1, minWidth: 60, refData: { 'MATCHED_MATERIAL_PACK': '✅', 'UNMATCHED_MATERIAL_PACK': '❌', 'TESTING_MATERIAL_PACK': '⚠️' } },
        { field: "mounterIdno", headerName: '機台', flex: 3, minWidth: 120 },
        { field: "boardSide", headerName: 'PCB面', flex: 2, minWidth: 90 },
        { field: "stage", headerName: 'Stage', flex: 2, minWidth: 80 },
        { field: "slot", headerName: '槽位', flex: 2, minWidth: 80 },
        { field: "operationTime", headerName: '上料時間', flex: 3, minWidth: 180, valueFormatter: (params) => params.value ? new Date(params.value).toLocaleString('zh-TW') : '' },
        { field: "materialIdno", headerName: '物料號', flex: 4, minWidth: 160 },
        { field: "materialInventoryIdno", headerName: '單包條碼', flex: 5, minWidth: 180 },
        { field: "remark", headerName: '備註', flex: 3, minWidth: 120 },
    ],
    defaultColDef: { editable: false, filter: true, sortable: true, resizable: true },
    enableCellChangeFlash: true,
    rowSelection: 'multiple',
    suppressCellFocus: true,
    getRowId: (params: GetRowIdParams<RowModel>) => `${params.data.mounterIdno}-${params.data.stage}-${params.data.slot}`,
};

onMounted(async () => {
    try {
        productionUuid.value = route.params.productionUuid.toString().trim();
        // 假設後端提供此 API 來獲取 Fuji 生產數據
        mounterData.value = await SmtService.getTheFujiItemStatsOfProduction({ uuid: productionUuid.value });

        if (mounterData.value.length > 0) {
            const firstRecord = mounterData.value[0];
            workOrderIdno.value = firstRecord.work_order_no;
            productIdno.value = firstRecord.product_idno;
            mounterIdno.value = firstRecord.machine_idno;
            boardSide.value = firstRecord.board_side;
            isTestingMode.value = firstRecord.produce_mode === ProduceTypeEnum.TESTING_PRODUCE_MODE;
            productionStarted.value = !firstRecord.production_end;
        }
    } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
            router.push('/http-status/404');
        } else {
            message.error("讀取生產資料失敗");
            console.error(error);
        }
    }

type CorrectState = 'true' | 'false' | 'warning'

function convertFeedMaterialType(s: string | null): FeedMaterialTypeEnum | null {
    return s as unknown as FeedMaterialTypeEnum
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

    const newRowData: RowModel[] = mounterData.value.map(stat => ({
        id: stat.id,
        correct: (stat as any).check_pack_code_match,
        mounterIdno: stat.machine_idno,
        boardSide: stat.board_side,
        stage: stat.sub_slot_idno, // Fuji 使用 sub_slot_idno 作為 Stage
        slot: Number(stat.slot_idno), // Fuji 使用 slot_idno 作為槽位號
        materialIdno: stat.material_idno,
        materialInventoryIdno: (stat as any).material_pack_code,
        operationTime: (stat as any).operation_time,
        remark: stat.produce_mode === ProduceTypeEnum.TESTING_PRODUCE_MODE && (stat as any).check_pack_code_match === CheckMaterialMatchEnum.TESTING_MATERIAL_PACK ? '[廠商測試新料]' : '',
    }));

    rowData.value = newRowData;
});

function onClickBackArrow(event: Event) {
    router.push(`/smt/fuji-mounter/`);
}

async function playSuccessTone() {
    await Tone.start();
    const synth = new Tone.Synth().toDestination();
    synth.triggerAttackRelease("C4", "8n", Tone.now());
}

async function playErrorTone() {
    await Tone.start();
    const synth = new Tone.Synth().toDestination();
    synth.triggerAttackRelease("D3", "8n", Tone.now());
}

async function showSuccess(msg: string) {
    await playSuccessTone();
    message.success(msg);
}

async function showError(msg: string) {
    await playErrorTone();
    message.error(msg);
}

async function onStopProduction() {
    if (!productionUuid.value) return showError('沒有生產ID，無法停止');
    dialog.warning({
        title: '停止生產確認',
        content: '確定要停止生產嗎？',
        positiveText: '確定',
        negativeText: '取消',
        onPositiveClick: async () => {
            try {
                await SmtService.updateFujiItemStatsEndTime({ uuid: productionUuid.value });
                productionStarted.value = false;
                showSuccess('生產已結束');
                router.push('/smt/fuji-mounter/');
            } catch (e) {
                showError('停止生產失敗');
                console.error(e);
            }
        },
    });
}
</script>

<template>
    <n-space vertical :wrap-item="false" style="height: calc(100vh - 60px);">
        <n-space vertical size="small" style="padding: 0px 1rem 0 1rem; position: sticky; top: 60px; background-color: var(--body-color); z-index: 1;">
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
                            <n-button v-if="productionStarted" type="error" size="small" @click="onStopProduction">
                                🛑 結束生產
                            </n-button>
                             <n-tag v-else type="success" size="small">
                                生產已結束
                            </n-tag>
                        </n-space>
                    </div>
                </template>
            </n-page-header>
        </n-space>

        <div style="height: calc(100vh - 180px); padding: 1rem;">
            <ag-grid-vue class="ag-theme-balham-dark" :rowData="rowData" style="height: 100%;" :gridOptions="gridOptions">
            </ag-grid-vue>
        </div>
    </n-space>
</template>