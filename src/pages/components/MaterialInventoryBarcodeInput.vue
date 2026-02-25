<script setup lang="ts">
import { ref, watch, computed, onMounted, onBeforeUnmount } from 'vue'
import { NForm, NFormItem, NInput, useMessage, InputInst } from 'naive-ui'
import * as Tone from 'tone'
import { ApiError, SmtMaterialInventory } from '@/client'
import { BarcodeScanUseCase } from '@/application/barcode-scan/BarcodeScanUseCase';
import { ApiMaterialRepository } from '@/infra/material/ApiMaterialRepository';
import { SimpleBarcodeValidator } from '@/domain/material/BarcodeValidator'
import { BarcodeScanDeps } from '@/application/barcode-scan/BarcodeScanDeps'
import {
    ScanResultLike,
    decideMaterialScanAction,
} from '@/domain/material/MaterialScanDecision'

type SmtMaterialInventoryEx = SmtMaterialInventory & { remark?: string }
type MatchedRow = unknown
type MatchedPayload = {
    materialInventory: SmtMaterialInventoryEx
    matchedRows: MatchedRow[]
}

/* ================= props / emits ================= */

const props = defineProps<{
    isTestingMode: boolean
    getMaterialMatchedRows: (materialIdno: string) => MatchedRow[]
    resetKey: number
    disabled?: boolean
    inputTestId?: string
    allowNoMatchInTesting?: boolean
    beforeScan?: (barcode: string) => boolean | Promise<boolean>
    scan?: (barcode: string) => Promise<ScanResultLike<SmtMaterialInventoryEx, MatchedRow>>
}>()

watch(
    () => props.resetKey,
    () => {
        reset()
    }
)

const emit = defineEmits<{
    (e: 'matched', payload: MatchedPayload): void
    (e: 'error', msg: string): void
}>()

/* ================= state ================= */

const message = useMessage()
const materialInventoryIdnoInput = ref<InputInst | null>(null)

const formValue = ref({
    materialInventoryIdno: ''
})
const PANASONIC_SLOT_SUBMITTED_EVENT = 'panasonic-slot-submitted'

/* ================= tone ================= */

async function playSuccessTone() {
    await Tone.start()
    const synth = new Tone.Synth().toDestination()
    const now = Tone.now()
    synth.triggerAttackRelease('C4', '8n', now)
    synth.triggerAttackRelease('G4', '8n', now + 0.1)
}

async function playErrorTone() {
    await Tone.start()
    const synth = new Tone.Synth().toDestination()
    const now = Tone.now()
    synth.triggerAttackRelease('D4', '8n', now)
    synth.triggerAttackRelease('D4', '8n', now + 0.2)
}

async function safePlaySuccessTone() {
    try {
        await playSuccessTone()
    } catch (error) {
        console.warn('playSuccessTone failed', error)
    }
}

async function safePlayErrorTone() {
    try {
        await playErrorTone()
    } catch (error) {
        console.warn('playErrorTone failed', error)
    }
}

/* ================= main logic ================= */

const scanUseCase = computed(() => {
    const deps: BarcodeScanDeps<MatchedRow> = {
        validator: new SimpleBarcodeValidator(),
        materialRepository: new ApiMaterialRepository(),
        isTestingMode: props.isTestingMode,
        getMaterialMatchedRows: props.getMaterialMatchedRows,
    }
    return new BarcodeScanUseCase(deps)
})

async function onSubmit() {
    const idno = formValue.value.materialInventoryIdno.trim()

    if (props.beforeScan) {
        const shouldContinue = await props.beforeScan(idno)
        if (!shouldContinue) {
            reset()
            return
        }
    }

    const result = props.scan
        ? await props.scan(idno)
        : await scanUseCase.value.execute(idno)

    const decision = decideMaterialScanAction(result, {
        isTestingMode: props.isTestingMode,
        allowNoMatchInTesting: props.allowNoMatchInTesting,
    })

    if (decision.action === 'matched') {
        emit('matched', decision.payload as MatchedPayload)
        if (decision.tone === 'success') {
            await safePlaySuccessTone()
            message.success(
                props.isTestingMode
                    ? '🧪 試產模式：物料匹配成功'
                    : '✅ 正式生產模式：物料匹配成功'
            )
        } else {
            await safePlaySuccessTone()
            const infoMessage =
                decision.messageKey === 'virtual'
                    ? '🧪 試產模式：使用虛擬物料'
                    : '🧪 試產模式：物料匹配成功'
            message.info(infoMessage)
        }

        return
    }

    await safePlayErrorTone()

    if (decision.errorKind === 'no_match') {
        emit('error', '槽位不存在')
        reset()
        return
    }

    if (decision.errorKind === 'api_error') {
        let msg = '未知 API 錯誤'
        const error = decision.error
        if (error instanceof ApiError) {
            msg = {
                404: '查無此條碼',
                504: 'ERP 連線超時',
                502: 'ERP 連線錯誤',
                500: '系統錯誤',
            }[error.status] ?? '未知錯誤'
        } else {
            console.error('An unexpected API error occurred', error)
        }
        emit('error', msg)
        reset()
        return
    }

    const error = decision.error as Error
    const errorMessage =
        error?.message === 'invalid barcode format' ? '請輸入物料號' : '未知例外'
    emit('error', errorMessage)
    console.error(decision.error)
    reset()
}

function reset() {
    formValue.value.materialInventoryIdno = ''
    materialInventoryIdnoInput.value?.focus()
}

function focus() {
    materialInventoryIdnoInput.value?.focus()
}

function clear() {
    formValue.value.materialInventoryIdno = ''
}

function handlePanasonicSlotSubmitted() {
    if (props.inputTestId !== 'panasonic-main-material-input') return
    reset()
}

onMounted(() => {
    window.addEventListener(PANASONIC_SLOT_SUBMITTED_EVENT, handlePanasonicSlotSubmitted)
})

onBeforeUnmount(() => {
    window.removeEventListener(PANASONIC_SLOT_SUBMITTED_EVENT, handlePanasonicSlotSubmitted)
})

defineExpose({ focus, clear })

</script>

<template>
    <n-form size="large" :model="formValue" @submit.prevent="onSubmit">
        <n-form-item label="物料單包條碼">
        <n-input ref="materialInventoryIdnoInput" autofocus v-model:value="formValue.materialInventoryIdno"
            :disabled="props.disabled" :data-testid="props.inputTestId" />
        </n-form-item>
    </n-form>
</template>
