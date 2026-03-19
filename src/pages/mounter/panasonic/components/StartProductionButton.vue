<script setup lang="ts">
import { ref } from 'vue'
import { useDialog } from 'naive-ui'
import {
    CheckMaterialMatchEnum,
    type PanasonicMounterItemStatCreate,
    type PanasonicMounterItemStatRead,
    ProduceTypeEnum,
    BoardSideEnum,
    MachineSideEnum,
    FeedMaterialTypeEnum,
    MaterialOperationTypeEnum,
    UnfeedMaterialTypeEnum,
    UnfeedReasonEnum,
    SmtService,
} from '@/client';
import { startPanasonicProduction } from '@/application/panasonic/production/StartPanasonicProduction'
import { StartProductionStatsUseCase } from '@/application/preproduction/StartProductionStatsUseCase'
import type { IpqcInspectionRecord } from '@/domain/mounter/ipqcTypes'

type CorrectState = 'true' | 'false' | 'warning' | 'unloaded'

type PanasonicUnloadRecord = {
    slotIdno: string
    subSlotIdno?: string | null
    materialPackCode: string
    unfeedReason?: string | null
    operationTime: string
}

type PanasonicSpliceRecord = {
    slotIdno: string
    subSlotIdno?: string | null
    materialPackCode: string
    correctState: 'true' | 'warning'
    operationTime: string
}

type RowModel = {
    correct: CorrectState | null,
    id: number,
    slotIdno: string,
    subSlotIdno: string,
    materialIdno: string,
    materialInventoryIdno: string,
    appendedMaterialInventoryIdno: string,
    remark?: string,
    firstAppendTime?: string | null,
}

type PanasonicStartStatPayload = PanasonicMounterItemStatCreate & {
    feed_material_pack_type?: FeedMaterialTypeEnum
    operation_type?: MaterialOperationTypeEnum
}

const props = defineProps({
    rowData: Array<RowModel>,
    isTestingMode: Boolean,
    operator_id: String,
    workOrderIdno: String,
    productIdno: String,
    mounterIdno: String,
    machineSideQuery: String,
    workSheetSideQuery: String,
    pendingUnloadRecords: {
        type: Array as () => PanasonicUnloadRecord[],
        default: () => [],
    },
    pendingSpliceRecords: {
        type: Array as () => PanasonicSpliceRecord[],
        default: () => [],
    },
    pendingIpqcRecords: {
        type: Array as () => IpqcInspectionRecord[],
        default: () => [],
    },
})

const emit = defineEmits(['started', 'error', 'unload-uploaded', 'ipqc-uploaded'])


const productionStatUuid = ref()
const machineSide = ref<MachineSideEnum>()
const dialog = useDialog()
const loading = ref(false)

function makeSlotKey(slot: string, subSlot?: string | null) {
    if (subSlot && subSlot.trim() !== '') {
        return `${slot}-${subSlot.trim()}`
    }
    return slot
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

const startStatsUseCase = new StartProductionStatsUseCase<RowModel, PanasonicUnloadRecord, PanasonicSpliceRecord, IpqcInspectionRecord>({
    startProduction: async (rows) => {
        machineSide.value =
            props.machineSideQuery === '1' ? MachineSideEnum.FRONT
                : props.machineSideQuery === '2' ? MachineSideEnum.BACK
                    : null
        const boardSide = convertBoardSide(props.workSheetSideQuery)
        const payload: PanasonicStartStatPayload[] = rows.map(row => ({
            operator_id: props.operator_id ?? null,
            operation_time: row.firstAppendTime
                ? new Date(row.firstAppendTime).toISOString()
                : new Date().toISOString(),
            production_start: new Date().toISOString(),
            work_order_no: props.workOrderIdno,
            product_idno: props.productIdno,
            machine_idno: props.mounterIdno,
            machine_side: machineSide.value,
            board_side: boardSide,
            slot_idno: row.slotIdno,
            sub_slot_idno: row.subSlotIdno ?? null,
            material_idno: row.materialIdno ?? null,
            material_pack_code: row.materialInventoryIdno ?? null,
            feed_material_pack_type: FeedMaterialTypeEnum.IMPORTED_MATERIAL_PACK,
            operation_type: MaterialOperationTypeEnum.FEED,
            produce_mode: convertProduceMode(props.isTestingMode ?? false),
            check_pack_code_match: convertMatch(row.correct),
        }))
        const response = await startPanasonicProduction(payload)
        if (!response?.length || !response[0].uuid) throw new Error('開始生產失敗')
        const statItemMap = new Map<string, number>()
        ;(response as PanasonicMounterItemStatRead[]).forEach(stat =>
            statItemMap.set(makeSlotKey(stat.slot_idno, stat.sub_slot_idno), stat.id)
        )
        productionStatUuid.value = response[0].uuid
        return { productionUuid: response[0].uuid, statItemMap }
    },
    uploadUnload: async (record, statItemMap) => {
        const id = statItemMap.get(makeSlotKey(record.slotIdno, record.subSlotIdno))
        if (id === undefined) return
        await SmtService.addPanasonicMounterItemStatRoll({
            requestBody: {
                stat_item_id: id,
                operator_id: null,
                operation_time: record.operationTime,
                slot_idno: record.slotIdno,
                sub_slot_idno: record.subSlotIdno ?? null,
                material_pack_code: record.materialPackCode,
                operation_type: MaterialOperationTypeEnum.UNFEED,
                unfeed_material_pack_type: UnfeedMaterialTypeEnum.PARTIAL_UNFEED,
                unfeed_reason: (record.unfeedReason as UnfeedReasonEnum) ?? null,
                check_pack_code_match: null,
            },
        })
    },
    uploadSplice: async (record, statItemMap) => {
        const id = statItemMap.get(makeSlotKey(record.slotIdno, record.subSlotIdno))
        if (id === undefined) return
        await SmtService.addPanasonicMounterItemStatRoll({
            requestBody: {
                stat_item_id: id,
                operator_id: null,
                operation_time: record.operationTime,
                slot_idno: record.slotIdno,
                sub_slot_idno: record.subSlotIdno ?? null,
                material_pack_code: record.materialPackCode,
                operation_type: MaterialOperationTypeEnum.FEED,
                feed_material_pack_type: FeedMaterialTypeEnum.NEW_MATERIAL_PACK,
                check_pack_code_match: record.correctState as CheckMaterialMatchEnum,
                unfeed_reason: null,
            },
        })
    },
    uploadIpqc: async (record, statItemMap) => {
        const id = statItemMap.get(makeSlotKey(record.slotIdno, record.subSlotIdno))
        if (id === undefined) return
        await SmtService.addPanasonicMounterItemStatRoll({
            requestBody: {
                stat_item_id: id,
                operator_id: record.inspectorIdno || null,
                operation_time: record.inspectionTime,
                slot_idno: record.slotIdno,
                sub_slot_idno: record.subSlotIdno ?? null,
                material_pack_code: record.materialPackCode,
                operation_type: MaterialOperationTypeEnum.FEED,
                feed_material_pack_type: FeedMaterialTypeEnum.INSPECTION_MATERIAL_PACK,
                check_pack_code_match: CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK,
                unfeed_reason: null,
            },
        })
    },
})

function onProduction() {
    const invalid = props.rowData.filter(r => {
        if (r.correct === 'false') return true
        if (r.correct === 'unloaded') return true
        if (!props.isTestingMode && r.correct == null) return true
        return false
    })

    if (invalid.length > 0) {
        emit('error', props.isTestingMode
            ? '尚有槽位不匹配，不能開始生產'
            : '尚有槽位未確認或不匹配，不能開始生產')
        return
    }

    dialog.warning({
        title: '開始生產確認',
        content: '確定要開始生產嗎？',
        positiveText: '確定',
        negativeText: '取消',
        onPositiveClick: () => startProductionUpload(),
        onNegativeClick: () => { }
    })
}

async function startProductionUpload(rows?: RowModel[]) {
    if (loading.value) return
    loading.value = true
    try {
        const productionUuid = await startStatsUseCase.execute({
            rowData: rows || props.rowData,
            pendingUnloadRecords: props.pendingUnloadRecords ?? [],
            pendingSpliceRecords: props.pendingSpliceRecords ?? [],
            pendingIpqcRecords: props.pendingIpqcRecords ?? [],
            onUnloadUploaded: (ok) => emit('unload-uploaded', ok),
            onIpqcUploaded: (ok) => emit('ipqc-uploaded', ok),
        })
        emit('started', productionUuid)
    } catch {
        emit('error', '資料上傳失敗')
    } finally {
        loading.value = false
    }
}

defineExpose({
    submit: startProductionUpload
})

</script>

<template>
    <n-button type="success" size="small" @click="onProduction" :loading="loading" :disabled="loading">
        🚀 開始生產
    </n-button>
</template>
