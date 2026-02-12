<script setup lang="ts">
import { GetRowIdParams, GridApi, GridOptions } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-balham.css";
import { AgGridVue } from "ag-grid-vue3";
import { InputInst, NButton, NForm, NFormItem, NGi, NGrid, NInput, NP, NPageHeader, NSpace, NTag, useDialog } from 'naive-ui';
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

import MaterialQueryModal from "./components/MaterialQueryModal.vue";
import { useDateFormatter } from '@/ui/shared/composables/useDateFormatter';
import { useUiNotifier } from '@/ui/shared/composables/useUiNotifier';
import { findLoadedSlotByPack, isInspectionScan, type StatLike } from '@/domain/production/PostProductionFeedRules';

const { format } = useDateFormatter();

const route = useRoute();
const router = useRouter();
const dialog = useDialog();
const { success: showSuccess, warn: showWarn, error: showError, info } = useUiNotifier();
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
const inspectionStats = ref<StatLike[]>([]);

const materialFormValue = ref({ materialInventoryIdno: '' });
const slotFormValue = ref({ slotIdno: '' });
const materialInputRef = ref<InputInst | null>(null);
const slotInputRef = ref<InputInst | null>(null);
let materialInventoryFromScan: SmtMaterialInventory | null = null;

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
    appendedMaterialInventoryIdno?: string;
    operationTime?: string | null;
    inspectTime?: string | null;
    inspectMaterialPackCode?: string | null;
    inspectCount?: number | null;
};

const rowData = ref<RowModel[]>([]);
const gridApi = ref<GridApi | null>(null);

function onGridReady(params: { api: GridApi }) {
    gridApi.value = params.api;
}

const gridOptions: GridOptions = {
    columnDefs: [
        { field: "correct", headerName: '', flex: 1, minWidth: 60, refData: { 'MATCHED_MATERIAL_PACK': '✅', 'UNMATCHED_MATERIAL_PACK': '❌', 'TESTING_MATERIAL_PACK': '⚠️' } },
        { headerName: '巡檢料號', field: 'inspectMaterialPackCode', flex: 4, minWidth: 160 },
        { headerName: '巡檢時間', field: 'inspectTime', flex: 3, minWidth: 180, valueFormatter: (params) => format(params.value) },
        { field: "mounterIdno", headerName: '機台', flex: 1, minWidth: 90 },
        { field: "stage", headerName: 'Stage', flex: 1, minWidth: 90 },
        { field: "slot", headerName: '槽位', flex: 1, minWidth: 90 },
        { field: "boardSide", headerName: 'PCB面', flex: 1, minWidth: 90 },
        { field: "operatorIdno", headerName: '上料人員', flex: 2, minWidth: 80 },
        { field: "operationTime", headerName: '上料時間', flex: 3, minWidth: 180, valueFormatter: (params) => format(params.value) },
        { field: "materialIdno", headerName: '物料號', flex: 4, minWidth: 160 },
        { field: "materialInventoryIdno", headerName: '單包條碼', flex: 5, minWidth: 180 },
        { field: "appendedMaterialInventoryIdno", headerName: '接料代碼', flex: 5, minWidth: 180 },
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
            showError("讀取生產資料失敗");
            console.error(error);
        }
    }

    let logs: any[] = [];
    try {
        logs = await SmtService.getTheFujiStatsOfLogsByUuid({ uuid: productionUuid.value });
        console.log(logs);
    } catch (e) {
        console.error("Failed to fetch logs", e);
    }
    inspectionStats.value = buildInspectionStats(logs, mounterData.value);

    const newRowData: RowModel[] = mounterData.value.map(stat => {
        let feedRecords = (stat as any).feed_records as any[] || [];

        if (logs.length > 0) {
            const statSlotKey = normalizeSlotKey(stat.slot_idno, stat.sub_slot_idno);
            const matchingLogs = logs.filter(
                l => normalizeSlotKey(l.slot_idno, l.sub_slot_idno) === statSlotKey
            );

            if (matchingLogs.length > 0) {
                feedRecords = mergeFeedRecords(feedRecords, matchingLogs);
            }
        }

        /** =========================
         *  巡檢紀錄
         *  ========================= */
        const normalizedFeedRecords = feedRecords.map((r: any) => ({
            ...r,
            feed_material_pack_type: normalizeFeedMaterialType(
                r.feed_material_pack_type ??
                r.feedMaterialPackType ??
                r.feed_material_type ??
                r.feedMaterialType ??
                ''
            ),
            material_pack_code:
                r.material_pack_code ??
                r.materialPackCode ??
                r.material_pack_idno ??
                r.materialPackIdno ??
                r.material_pack_code
        }));

        const inspectionRecords = normalizedFeedRecords.filter(
            (r: any) =>
                r.feed_material_pack_type === FeedMaterialTypeEnum.INSPECTION_MATERIAL_PACK
        );

        const inspectCount = inspectionRecords.length;

        const latestInspection = inspectionRecords
            .sort((a: any, b: any) =>
                new Date(b.operation_time).getTime() -
                new Date(a.operation_time).getTime()
            )[0] ?? null;

        /** =========================
         *  上料 / 接料紀錄
         *  ========================= */
        const materialRecords = normalizedFeedRecords
            .filter(
                (r: any) =>
                    r.feed_material_pack_type !== FeedMaterialTypeEnum.INSPECTION_MATERIAL_PACK
            )
            .sort((a: any, b: any) =>
                new Date(a.operation_time).getTime() -
                new Date(b.operation_time).getTime()
            );

        const importMaterialPack = normalizedFeedRecords.find(
            (r: any) => r.feed_material_pack_type === FeedMaterialTypeEnum.IMPORTED_MATERIAL_PACK
        );

        const latestMaterialRecord =
            materialRecords.length > 0
                ? materialRecords[materialRecords.length - 1]
                : null;

        const appendedCodes = [
            ...new Set(
                normalizedFeedRecords
                    .filter((r: any) => r.feed_material_pack_type !== FeedMaterialTypeEnum.IMPORTED_MATERIAL_PACK)
                    .map((r: any) => r.material_pack_code)
                    .filter((c: any) => !!c)
            )
        ].join(', ');

        /** =========================
         *  Stage 正規化
         *  ========================= */
        let stage = stat.sub_slot_idno;
        if (stage === '1') stage = 'A';
        else if (stage === '2') stage = 'B';
        else if (stage === '3') stage = 'C';
        else if (stage === '4') stage = 'D';

        const checkPackCodeMatch = importMaterialPack?.check_pack_code_match ?? (stat as any).check_pack_code_match;

        /** =========================
         *  備註
         *  ========================= */
        let remark =
            stat.produce_mode === ProduceTypeEnum.TESTING_PRODUCE_MODE &&
                checkPackCodeMatch === CheckMaterialMatchEnum.TESTING_MATERIAL_PACK
                ? '[廠商測試新料]'
                : '';

        if (inspectCount > 0) {
            remark = `${remark} 巡檢 ${inspectCount} 次`.trim();
        }
        console.log(importMaterialPack)
        return {
            id: stat.id,
            correct: checkPackCodeMatch,

            inspectMaterialPackCode:
                latestInspection?.material_pack_code ?? '',
            inspectTime:
                latestInspection?.operation_time ?? null,
            inspectCount,

            mounterIdno: stat.machine_idno,
            boardSide: stat.board_side,
            stage,
            slot: Number(stat.slot_idno),

            materialIdno: stat.material_idno,

            /** ✅ 單包條碼（一定顯示） */
            materialInventoryIdno:
                latestMaterialRecord?.material_pack_code ?? '',

            /** ✅ 接料 / 上料時間（一定顯示） */
            operationTime:
                latestMaterialRecord?.operation_time ?? null,

            appendedMaterialInventoryIdno: appendedCodes,
            remark,
        };
    });


    rowData.value = newRowData;
});

function onClickBackArrow(event: Event) {
    router.push(`/smt/fuji-mounter/`);
}

function parseSlotIdno(
    slotIdno: string
): [string | null, string | null, number | null] {
    // Slot barcode format: mounterId-stage-slotNumber, e.g., XP2B1-A-25
    const slotIdnoArray = slotIdno.split('-');
    if (slotIdnoArray.length < 3) return [null, null, null];
    const machineIdno = slotIdnoArray[0];
    let stage = slotIdnoArray[1];

    // Handle numeric stage mapping if necessary (1->A, 2->B, etc.)
    if (stage === '1') stage = 'A';
    else if (stage === '2') stage = 'B';
    else if (stage === '3') stage = 'C';
    else if (stage === '4') stage = 'D';

    const slotNumber = Number(slotIdnoArray[2]);
    return [machineIdno, stage, slotNumber];
}

function normalizeStageLabel(stage: unknown): string {
    if (stage == null) return '';
    const value = String(stage);
    if (value === '1') return 'A';
    if (value === '2') return 'B';
    if (value === '3') return 'C';
    if (value === '4') return 'D';
    return value;
}

function normalizeSlotKey(slotIdnoRaw: unknown, subSlotRaw: unknown): string {
    const slotIdno = String(slotIdnoRaw ?? '').trim();
    const subSlotIdno = normalizeStageLabel(subSlotRaw ?? '');
    return `${slotIdno}-${subSlotIdno}`;
}

function statMatchesStage(statStage: unknown, inputStage: string | null) {
    if (!inputStage) return false;
    const rawStage = String(statStage ?? '');
    const labelStage = normalizeStageLabel(statStage);
    return inputStage === rawStage || inputStage === labelStage;
}

function normalizeFeedMaterialType(value: unknown): string {
    const raw = String(value ?? '').trim();
    if (!raw) return '';
    const upper = raw.toUpperCase();
    if (upper.includes('IMPORT')) return FeedMaterialTypeEnum.IMPORTED_MATERIAL_PACK;
    if (upper.includes('INSPECT')) return FeedMaterialTypeEnum.INSPECTION_MATERIAL_PACK;
    if (upper.includes('REUSE')) return FeedMaterialTypeEnum.REUSED_MATERIAL_PACK;
    if (upper.includes('NEW')) return FeedMaterialTypeEnum.NEW_MATERIAL_PACK;
    return upper;
}

function getRecordType(record: any): string {
    return normalizeFeedMaterialType(
        record?.feed_material_pack_type ??
        record?.feedMaterialPackType ??
        record?.feed_material_type ??
        record?.feedMaterialType ??
        ''
    );
}

function getRecordPackCode(record: any): string | null {
    return (
        record?.material_pack_code ??
        record?.materialPackCode ??
        record?.material_pack_idno ??
        record?.materialPackIdno ??
        null
    );
}

function getRecordUniqueKey(record: any): string {
    const recordId = record?.feed_record_id ?? record?.feedRecordId ?? record?.id;
    if (recordId != null) return `record_id:${recordId}`;
    const slotIdno = record?.slot_idno ?? record?.slotIdno ?? '';
    const subSlotIdno = record?.sub_slot_idno ?? record?.subSlotIdno ?? '';
    const operationTime = record?.operation_time ?? record?.operationTime ?? record?.created_at ?? '';
    const materialPackCode = getRecordPackCode(record) ?? '';
    return `composite:${getRecordType(record)}-${normalizeSlotKey(slotIdno, subSlotIdno)}-${materialPackCode}-${operationTime}`;
}

function mergeFeedRecords(baseRecords: any[], logRecords: any[]): any[] {
    const recordMap = new Map<string, any>();
    baseRecords.forEach((record: any) => recordMap.set(getRecordUniqueKey(record), record));
    logRecords.forEach((record: any) => recordMap.set(getRecordUniqueKey(record), record));
    return Array.from(recordMap.values());
}

function buildInspectionStats(logs: any[], stats: FujiMounterItemStatRead[]): StatLike[] {
    const map = new Map<string, StatLike>();

    const addRecord = (slotIdnoRaw: unknown, subSlotRaw: unknown, record: any) => {
        const slotIdno = String(slotIdnoRaw ?? '').trim();
        if (!slotIdno) return;
        const subSlotIdno = normalizeStageLabel(subSlotRaw ?? '');
        const key = normalizeSlotKey(slotIdno, subSlotIdno);

        let stat = map.get(key);
        if (!stat) {
            stat = {
                slotIdno,
                subSlotIdno,
                feedRecords: []
            };
            map.set(key, stat);
        }

        stat.feedRecords?.push({
            feedMaterialPackType: getRecordType(record),
            materialPackCode: getRecordPackCode(record)
        });
    };

    logs.forEach((record) => addRecord(record?.slot_idno, record?.sub_slot_idno, record));

    stats.forEach((stat) => {
        const feedRecords = (stat as any)?.feed_records ?? [];
        feedRecords.forEach((record: any) => {
            addRecord(stat.slot_idno, stat.sub_slot_idno, record);
        });
    });

    return Array.from(map.values());
}

function getMaterialMatchedRows(materialIdno: string): RowModel[] {
    return rowData.value.filter(row => row.materialIdno === materialIdno);
}

function resetForms() {
    materialFormValue.value.materialInventoryIdno = '';
    slotFormValue.value.slotIdno = '';
    materialInventoryFromScan = null;
    materialInputRef.value?.focus();
}

function applyInspectionUpdate(
    mounter: string,
    stage: string | null,
    slot: number | null,
    materialIdno: string
) {
    const rowId = `${mounter}-${stage}-${slot}`;
    const rowNode = gridApi.value?.getRowNode(rowId);
    if (rowNode) {
        const nextCount = (rowNode.data.inspectCount ?? 0) + 1;
        rowNode.setDataValue('inspectMaterialPackCode', materialIdno);
        rowNode.setDataValue('inspectTime', new Date().toISOString());
        rowNode.setDataValue('inspectCount', nextCount);
        rowNode.setDataValue('remark', `巡檢 ${nextCount} 次`);
        return;
    }

    const row = rowData.value.find(
        r =>
            r.mounterIdno === mounter &&
            r.stage === stage &&
            r.slot === slot
    );
    if (!row) return;

    row.inspectMaterialPackCode = materialIdno;
    row.inspectTime = new Date().toISOString();
    row.inspectCount = (row.inspectCount ?? 0) + 1;
    row.remark = `巡檢 ${row.inspectCount} 次`;

    if (gridApi.value) {
        gridApi.value.applyTransaction({ update: [row] });
    }
}

async function onSubmitMaterialInventoryForm() {
    const idno = materialFormValue.value.materialInventoryIdno.trim();
    if (!idno) return showWarn('請輸入物料號');

    try {
        materialInventoryFromScan = await SmtService.getMaterialInventoryForSmt({ materialInventoryIdno: idno });
    } catch (error) {
        if (isTestingMode.value && error instanceof ApiError && error.status === 404) {
            info(`${MODE_NAME_TESTING}：使用測試物料 ${idno}`);
            materialInventoryFromScan = {
                idno: idno,
                material_idno: `TEST-${idno}`,
                material_id: 0,
                material_name: 'Testing Material'
            } as unknown as SmtMaterialInventory;
        } else {
            const msg = { 404: '查無此條碼', 504: 'ERP 連線超時', 502: 'ERP 連線錯誤' }[(error as ApiError).status] ?? '條碼查詢失敗';
            showError(msg);
            resetForms();
            return;
        }
    }

    const matchedRows = getMaterialMatchedRows(materialInventoryFromScan.material_idno);
    if (matchedRows.length === 0) {
        if (!isTestingMode.value) {
            showError('無匹配槽位');
            resetForms();
            return;
        } else {
            info('無匹配槽位，請掃描任意槽位以強制綁定');
        }
    } else {
        showSuccess(`掃描成功：${materialInventoryFromScan.material_idno}`);
    }

    slotInputRef.value?.focus();
}


function toPackCodeMatch(state: CheckMaterialMatchEnum | null): 'true' | 'false' | 'warning' | null {
    if (state == null) return null;
    if (state === CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK) return 'true';
    if (state === CheckMaterialMatchEnum.UNMATCHED_MATERIAL_PACK) return 'false';
    if (state === CheckMaterialMatchEnum.TESTING_MATERIAL_PACK) return 'warning';
    return null;
}

async function appendedMaterialUpload(params: {
    stat_id: number,
    inputSlot: string,
    inputSubSlot: string | null,   // ✅ 修正
    materialInventory: SmtMaterialInventory,
    correctState: CheckMaterialMatchEnum
}) {
    const payload = {
        stat_item_id: params.stat_id,
        operator_id: '',
        operation_time: new Date().toISOString(),
        slot_idno: params.inputSlot,
        sub_slot_idno: params.inputSubSlot ?? null,
        material_pack_code: params.materialInventory.idno,
        feed_material_pack_type: 'new',
        check_pack_code_match: toPackCodeMatch(params.correctState)
    };
    await SmtService.addFujiMounterItemStatRoll({ requestBody: payload as any });
}

async function inspectionUpload(params: {
    stat_id: number,
    inputSlot: string,
    inputSubSlot: string | null,
    materialInventory: SmtMaterialInventory
}) {
    const payload = {
        stat_item_id: params.stat_id,
        operator_id: '',
        operation_time: new Date().toISOString(),
        slot_idno: params.inputSlot,
        sub_slot_idno: params.inputSubSlot ?? null,
        material_pack_code: params.materialInventory.idno,
        feed_material_pack_type: 'inspect',
        check_pack_code_match: 'true'
    };
    await SmtService.addFujiMounterItemStatRoll({ requestBody: payload as any });
}
async function onSubmitSlotForm() {
    const inputSlotIdno = slotFormValue.value.slotIdno.trim();
    if (!inputSlotIdno) return showWarn('請輸入槽位');
    if (!materialInventoryFromScan) return showError('請先掃描物料條碼');

    const [mounter, stage, slot] = parseSlotIdno(inputSlotIdno);
    if (!mounter) return showError('槽位條碼格式錯誤');

    if (!isTestingMode.value && productionStarted.value && materialInventoryFromScan) {
        const stat = inspectionStats.value.find(
            stat =>
                String(stat.slotIdno) === String(slot ?? '') &&
                statMatchesStage(stat.subSlotIdno, stage)
        );

        if (stat) {
            const isInspection = isInspectionScan({
                productionStarted: productionStarted.value,
                stat,
                importPackType: FeedMaterialTypeEnum.IMPORTED_MATERIAL_PACK,
                inputPackIdno: materialInventoryFromScan.idno
            });

            if (isInspection) {
                const statItem = mounterData.value.find(
                    stat =>
                        String(stat.slot_idno) === String(slot ?? '') &&
                        statMatchesStage(stat.sub_slot_idno, stage)
                );
                if (!statItem) {
                    showError(`找不到槽位 ${stage}-${slot}`);
                    resetForms();
                    return;
                }
                try {
                    await inspectionUpload({
                        stat_id: statItem.id,
                        inputSlot: String(slot),
                        inputSubSlot: stage,
                        materialInventory: materialInventoryFromScan
                    });

                    applyInspectionUpdate(mounter, stage, slot, materialInventoryFromScan.idno);

                    showSuccess(`巡檢通過：${stage}-${slot}`);
                } catch (error) {
                    showError('巡檢上傳失敗');
                    console.error(error);
                }

                resetForms();
                return;
            }
        }

        const loadedSlot = findLoadedSlotByPack({
            stats: inspectionStats.value,
            importPackType: FeedMaterialTypeEnum.IMPORTED_MATERIAL_PACK,
            inputPackIdno: materialInventoryFromScan.idno
        });

        if (loadedSlot) {
            const loadedStage = normalizeStageLabel(loadedSlot.subSlotIdno ?? '');
            const isSameSlot =
                String(loadedSlot.slotIdno) === String(slot ?? '') &&
                loadedStage === String(stage ?? '');
            if (!isSameSlot) {
                showError(`巡檢失敗：此料號位於 ${loadedStage}-${loadedSlot.slotIdno}，非 ${stage}-${slot}`);
                resetForms();
                return;
            }
        }
    }

    const matchedRows = getMaterialMatchedRows(materialInventoryFromScan.material_idno);
    const targetRow = matchedRows.find(r => r.mounterIdno === mounter && r.stage === stage && r.slot === slot);

    if (targetRow) {
        try {
            await appendedMaterialUpload({
                stat_id: targetRow.id,
                inputSlot: String(slot),
                inputSubSlot: stage,
                materialInventory: materialInventoryFromScan,
                correctState: CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK
            });
            // Update Row Data
            const rowNode = gridApi.value?.getRowNode(`${mounter}-${stage}-${slot}`);
            if (rowNode) {
                rowNode.setDataValue('correct', CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK);
                rowNode.setDataValue('operationTime', new Date().toISOString());

                const currentAppended = rowNode.data.appendedMaterialInventoryIdno || '';
                const currentCodes = currentAppended ? currentAppended.split(',').map(s => s.trim()) : [];
                if (materialInventoryFromScan.idno && !currentCodes.includes(materialInventoryFromScan.idno)) {
                    currentCodes.push(materialInventoryFromScan.idno);
                }
                const newAppended = currentCodes.join(', ');
                rowNode.setDataValue('appendedMaterialInventoryIdno', newAppended);
            }
            showSuccess(`${isTestingMode.value ? MODE_NAME_TESTING : MODE_NAME_NORMAL}：物料綁定成功`);
        } catch (error) {
            showError('上傳接料資料失敗');
            console.error(error);
        }
    } else {
        if (isTestingMode.value) {
            const rowNode = gridApi.value?.getRowNode(`${mounter}-${stage}-${slot}`);
            if (rowNode) {
                try {
                    await appendedMaterialUpload({
                        stat_id: rowNode.data.id,
                        inputSlot: String(slot),
                        inputSubSlot: stage,
                        materialInventory: materialInventoryFromScan,
                        correctState: CheckMaterialMatchEnum.TESTING_MATERIAL_PACK
                    });
                    rowNode.setDataValue('correct', CheckMaterialMatchEnum.TESTING_MATERIAL_PACK);
                    rowNode.setDataValue('remark', '[廠商測試新料]');
                    rowNode.setDataValue('operationTime', new Date().toISOString());

                    const currentAppended = rowNode.data.appendedMaterialInventoryIdno || '';
                    const currentCodes = currentAppended ? currentAppended.split(',').map(s => s.trim()) : [];
                    if (materialInventoryFromScan.idno && !currentCodes.includes(materialInventoryFromScan.idno)) {
                        currentCodes.push(materialInventoryFromScan.idno);
                    }
                    const newAppended = currentCodes.join(', ');
                    rowNode.setDataValue('appendedMaterialInventoryIdno', newAppended);
                    showSuccess(`${MODE_NAME_TESTING}：槽位 ${stage}-${slot} 已標記為測試料`);
                } catch (error) {
                    showError('上傳接料資料失敗');
                    console.error(error);
                }
            } else {
                showError(`找不到輸入的槽位 ${inputSlotIdno}`);
            }
        } else {
            const rowNode = gridApi.value?.getRowNode(`${mounter}-${stage}-${slot}`);
            if (rowNode) {
                try {
                    await appendedMaterialUpload({
                        stat_id: rowNode.data.id,
                        inputSlot: String(slot),
                        inputSubSlot: stage,
                        materialInventory: materialInventoryFromScan,
                        correctState: CheckMaterialMatchEnum.UNMATCHED_MATERIAL_PACK
                    });
                    rowNode.setDataValue('correct', CheckMaterialMatchEnum.UNMATCHED_MATERIAL_PACK);
                    rowNode.setDataValue('operationTime', new Date().toISOString());

                    const currentAppended = rowNode.data.appendedMaterialInventoryIdno || '';
                    const currentCodes = currentAppended ? currentAppended.split(',').map(s => s.trim()) : [];
                    if (materialInventoryFromScan.idno && !currentCodes.includes(materialInventoryFromScan.idno)) {
                        currentCodes.push(materialInventoryFromScan.idno);
                    }
                    const newAppended = currentCodes.join(', ');
                    rowNode.setDataValue('appendedMaterialInventoryIdno', newAppended);
                } catch (error) {
                    console.error(error);
                }
            }
            showError(`錯誤的槽位，此物料應放置於 ${matchedRows.map(r => `${r.stage}-${r.slot}`).join(', ')}`);
        }
    }
    resetForms();
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

const showMaterialQueryModal = ref(false);

function onMaterialQuery() {
    showMaterialQueryModal.value = true;
}
</script>

<template>
    <MaterialQueryModal v-model:show="showMaterialQueryModal" :uuid="productionUuid" @error="showError" />

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
                            <n-button v-if="productionStarted" type="error" size="small" @click="onStopProduction">
                                🛑 結束生產
                            </n-button>
                            <n-tag v-else type="success" size="small">
                                生產已結束
                            </n-tag>
                            <n-button type="info" size="small" @click="onMaterialQuery">
                                🔍 接料查詢
                            </n-button>
                        </n-space>
                    </div>
                </template>
            </n-page-header>
        </n-space>

        <n-grid cols="1 s:2" responsive="screen" x-gap="20" style="padding: 0 1rem;">
            <n-gi>
                <n-form size="large" :model="materialFormValue" @submit.prevent="onSubmitMaterialInventoryForm">
                    <n-form-item label="物料單包條碼">
                        <n-input  data-testid="material-input" type="text" size="large" v-model:value.lazy="materialFormValue.materialInventoryIdno"
                            autofocus ref="materialInputRef" :disabled="!productionStarted" placeholder="請掃描物料" />
                    </n-form-item>
                </n-form>
            </n-gi>
            <n-gi>
                <n-form size="large" :model="slotFormValue" @submit.prevent="onSubmitSlotForm">
                    <n-form-item label="位置">
                        <n-input type="text" size="large" v-model:value.lazy="slotFormValue.slotIdno" ref="slotInputRef"
                            :disabled="!productionStarted" placeholder="請掃描槽位" />
                    </n-form-item>
                </n-form>
            </n-gi>
        </n-grid>

        <div style="height: calc(100vh - 180px); padding: 1rem;">
            <ag-grid-vue class="ag-theme-balham-dark" :rowData="rowData" style="height: 100%;"
                :gridOptions="gridOptions" @grid-ready="onGridReady">
            </ag-grid-vue>
        </div>
    </n-space>
</template>
