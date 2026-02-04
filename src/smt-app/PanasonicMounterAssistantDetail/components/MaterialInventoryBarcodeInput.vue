<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { NForm, NFormItem, NInput, useMessage, InputInst } from 'naive-ui'
import * as Tone from 'tone'
import { ApiError, SmtMaterialInventory, SmtService } from '@/client'
import { BarcodeScanUseCase } from '@/application/barcode-scan/BarcodeScanUseCase';
import { ApiMaterialRepository } from '@/infrastruture/api/material/ApiMaterialRepository';
import { SimpleBarcodeValidator } from '@/application/barcode-scan/SimpleBarcodeValidator'
import { BarcodeScanDeps } from '@/application/barcode-scan/BarcodeScanDeps'

type SmtMaterialInventoryEx = SmtMaterialInventory & { remark?: string }

/* ================= props / emits ================= */

const props = defineProps<{
    isTestingMode: boolean
    getMaterialMatchedRows: (materialIdno: string) => any[]
    resetKey: number
}>()

watch(
    () => props.resetKey,
    () => {
        reset()
    }
)

const emit = defineEmits<{
    (e: 'matched', payload: {
        materialInventory: SmtMaterialInventoryEx
        matchedRows: any[]
    }): void
    (e: 'error', msg: string): void
}>()

/* ================= state ================= */

const message = useMessage()
const materialInventoryIdnoInput = ref<InputInst | null>(null)

const formValue = ref({
    materialInventoryIdno: ''
})

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

/* ================= main logic ================= */

const scanUseCase = computed(() => {
    const deps: BarcodeScanDeps = {
        validator: new SimpleBarcodeValidator(),
        materialRepository: new ApiMaterialRepository(),
        isTestingMode: props.isTestingMode,
        getMaterialMatchedRows: props.getMaterialMatchedRows,
    }
    return new BarcodeScanUseCase(deps)
})

async function onSubmit() {
    const idno = formValue.value.materialInventoryIdno.trim()

    const result = await scanUseCase.value.execute(idno);

    switch (result.status) {
        case 'success':
            await playSuccessTone();
            message.success(
                props.isTestingMode
                    ? '🧪 試產模式：物料匹配成功'
                    : '✅ 正式生產模式：物料匹配成功'
            );
            emit('matched', result.data);
            break;

        case 'virtual_success':
            await playSuccessTone();
            message.info('🧪 試產模式：使用虛擬物料');
            emit('matched', result.data);
            break;

        case 'no_match_in_grid':
            await playErrorTone();
            emit('error', '表格內無此物料');
            reset();
            break;

        case 'api_error':
            await playErrorTone();
            let msg = '未知 API 錯誤';
            if (result.error instanceof ApiError) {
                msg = {
                    404: '查無此條碼',
                    504: 'ERP 連線超時',
                    502: 'ERP 連線錯誤',
                    500: '系統錯誤'
                }[result.error.status] ?? '未知錯誤';
            } else {
                console.error("An unexpected API error occurred", result.error);
            }
            emit('error', msg);
            reset();
            break;

        case 'unknown_error':
            await playErrorTone();
            const error = result.error as Error;
            const errorMessage = error.message === 'invalid barcode format' ? '請輸入物料號' : '未知例外';
            emit('error', errorMessage);
            console.error(result.error);
            reset();
            break;
    }
}

function reset() {
    formValue.value.materialInventoryIdno = ''
    materialInventoryIdnoInput.value?.focus()
}


</script>

<template>
    <n-form size="large" :model="formValue" @submit.prevent="onSubmit">
        <n-form-item label="物料單包條碼">
            <n-input ref="materialInventoryIdnoInput" autofocus v-model:value.lazy="formValue.materialInventoryIdno" />
        </n-form-item>
    </n-form>
</template>
