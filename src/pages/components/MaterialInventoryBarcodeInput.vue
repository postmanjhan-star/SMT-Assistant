<script setup lang="ts">
import { ref, watch, computed, onMounted, onBeforeUnmount } from 'vue'
import { NFormItem, NInput, useMessage, InputInst } from 'naive-ui'
import * as Tone from 'tone'
import { SmtMaterialInventory } from '@/client'
import { BarcodeScanUseCase } from '@/application/barcode-scan/BarcodeScanUseCase';
import { ApiMaterialRepository } from '@/infra/material/ApiMaterialRepository';
import { SimpleBarcodeValidator } from '@/domain/material/BarcodeValidator'
import { BarcodeScanDeps } from '@/application/barcode-scan/BarcodeScanDeps'
import {
    ScanResultLike,
    decideMaterialScanAction,
} from '@/domain/material/MaterialScanDecision'
import { resolveMaterialLookupError } from '@/domain/material/MaterialLookupError'

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
    modelValue?: string
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
    (e: 'update:modelValue', value: string): void
}>()

/* ================= state ================= */

const message = useMessage()
const materialInventoryIdnoInput = ref<InputInst | null>(null)

const formValue = ref({
    materialInventoryIdno: ''
})

const inputValue = computed({
    get: () =>
        props.modelValue !== undefined
            ? props.modelValue
            : formValue.value.materialInventoryIdno,
    set: (value: string) => {
        if (props.modelValue !== undefined) {
            emit('update:modelValue', value)
            return
        }
        formValue.value.materialInventoryIdno = value
    },
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
    const idno = inputValue.value.trim()

    if (props.beforeScan) {
        const shouldContinue = await props.beforeScan(idno)
        if (!shouldContinue) {
            reset()
            return
        }
    }

    let result: ScanResultLike<SmtMaterialInventoryEx, MatchedRow>
    try {
        result = props.scan
            ? await props.scan(idno)
            : await scanUseCase.value.execute(idno)
    } catch (error) {
        await safePlayErrorTone()
        emit('error', resolveMaterialLookupError(error))
        reset()
        return
    }

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
        const error = decision.error
        emit('error', resolveMaterialLookupError(error))
        reset()
        return
    }

    const error = decision.error as Error
    const errorMessage =
        error?.message === 'invalid barcode format'
            ? '請輸入物料號'
            : resolveMaterialLookupError(decision.error)
    emit('error', errorMessage)
    console.error(decision.error)
    reset()
}

function reset() {
    inputValue.value = ''
    materialInventoryIdnoInput.value?.focus()
}

function focus() {
    materialInventoryIdnoInput.value?.focus()
}

function clear() {
    inputValue.value = ''
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
    <n-form-item label="物料單包條碼">
        <n-input ref="materialInventoryIdnoInput" autofocus v-model:value="inputValue"
            :disabled="props.disabled" :data-testid="props.inputTestId"
            @keydown.enter.prevent="onSubmit" />
    </n-form-item>
</template>
