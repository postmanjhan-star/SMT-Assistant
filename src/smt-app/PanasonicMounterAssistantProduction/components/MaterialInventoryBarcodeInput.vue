<script setup lang="ts">
import { ref, watch } from 'vue'
import { NForm, NFormItem, NInput, useMessage, InputInst } from 'naive-ui'
import * as Tone from 'tone'
import { ApiError, SmtMaterialInventory, SmtService } from '@/client'

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
        formValue.value.materialInventoryIdno = ''
        materialInventoryIdnoInput.value?.focus()
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

function createVirtualMaterial(
    idno: string,
    options?: {
        materialIdno?: string
        materialName?: string
        remark?: string
    }
): SmtMaterialInventoryEx {

    const virtualMaterial = {
        id: -1,
        idno: idno,
        material_idno: options?.materialIdno ?? 'TEST-MATERIAL',
        material_name: options?.materialName ?? 'TEST-MATERIAL',
        remark: options?.remark ?? '[廠商測試新料]',
    } as SmtMaterialInventory & { remark?: string }   // ✅ 安全轉型

    return virtualMaterial
}

async function onSubmit() {
    const idno = formValue.value.materialInventoryIdno.trim()
    if (!idno) {
        message.warning('請輸入物料號')
        return
    }

    try {
        // ✅ 只處理「真的有查到」的情況
        const materialInventory =
            await SmtService.getMaterialInventoryForSmt({ materialInventoryIdno: idno })

        const matchedRows = props.getMaterialMatchedRows(
            materialInventory.material_idno
        )

        if (matchedRows.length === 0) {
            await playErrorTone()
            emit('error', '表格內無此物料')
            reset()
            return
        }

        await playSuccessTone()
        message.success(
            props.isTestingMode
                ? '🧪 試產模式：物料匹配成功'
                : '✅ 正式生產模式：物料匹配成功'
        )

        emit('matched', {
            materialInventory,
            matchedRows
        })

    } catch (error) {
        // 🧪沒有查到，在 catch 裡處理虛擬料
        if (
            props.isTestingMode &&
            error instanceof ApiError &&
            error.status === 404
        ) {
            const virtualMaterial = createVirtualMaterial(idno)

            await playSuccessTone()
            message.info('🧪 試產模式：使用虛擬物料')

            emit('matched', {
                materialInventory: virtualMaterial,
                matchedRows: []
            })

            return
        }

        await playErrorTone()
        if (error instanceof ApiError) {
            const msg = {
                404: '查無此條碼',
                504: 'ERP 連線超時',
                502: 'ERP 連線錯誤',
                500: '系統錯誤'
            }[error.status] ?? '未知錯誤'

            emit('error', msg)
        } else {
            emit('error', '未知例外')
        }

        reset()
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
