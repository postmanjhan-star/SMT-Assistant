<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { NFormItem, NInput, InputInst } from 'naive-ui'
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
import { useUiNotifier } from '@/ui/shared/composables/useUiNotifier'
import { msg } from '@/ui/shared/messageCatalog'

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

const { success, info, playSuccessTone } = useUiNotifier()
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
            await success(msg.materialScan.matchSuccess(props.isTestingMode))
        } else {
            await playSuccessTone().catch(() => {})
            const infoMessage =
                decision.messageKey === 'virtual'
                    ? msg.materialScan.virtualMaterial
                    : msg.materialScan.testingMatchSuccess
            info(infoMessage)
        }

        return
    }

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

defineExpose({ focus, clear })

</script>

<template>
    <n-form-item label="物料單包條碼">
        <n-input ref="materialInventoryIdnoInput" autofocus v-model:value="inputValue"
            :disabled="props.disabled" :data-testid="props.inputTestId"
            @keydown.enter.prevent="onSubmit" />
    </n-form-item>
</template>
