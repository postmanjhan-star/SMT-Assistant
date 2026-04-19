<script setup lang="ts">
import { type FormItemRule, type FormRules, NButton, NCheckbox, NForm, NFormItemGi, NGi, NGrid, NH1, NInput, NRadioButton, NRadioGroup, NSpace, NSwitch, NSelect } from 'naive-ui'
import { useMeta } from 'vue-meta'
import { useRouter } from 'vue-router'
import { useMounterHomeForm } from '@/ui/shared/composables/useMounterHomeForm'
import { createPanasonicHomeDeps } from '@/ui/di/panasonic/createPanasonicHomeDeps'

useMeta({ title: 'Panasonic Mounter Assistant' })
const router = useRouter()
const homeDeps = createPanasonicHomeDeps()

const machineSideOptions = [
    { label: '機台前面', value: '1' },
    { label: '機台背面', value: '2' },
    { label: '機台正反面', value: '1+2' },
]

const panasonicExtraRules: FormRules = {
    machineSide: {
        required: true,
        message: '請選擇機台面向',
        trigger: ['change'],
        validator: (_rule: FormItemRule, value: string) => value != null,
    },
}

const { isTestingMode, autoFillProductIdno, formRef, formValue, mounterOptions, rules,
    workSheetSideOptions, onToggleTestingMode, onClickSubmitButton } =
    useMounterHomeForm({
        initialFormValue: {
            workOrderIdno: '',
            productIdno: '',
            mounterIdno: '',
            workSheetSide: null,
            machineSide: null as '1' | '2' | '1+2' | null,
        },
        testingDefaults: {
            workOrderIdno: 'ZZ9999',
            productIdno: '40Y85-009B-9',
            mounterIdno: 'A1-NPM-W2',
            workSheetSide: 'DUPLEX',
            machineSide: '1+2',
        },
        extraRules: panasonicExtraRules,
        findMounterIdnosByProductIdno: homeDeps.findMounterIdnosByProductIdno,
        getStWorkOrder: homeDeps.getStWorkOrder,
        submitAndNavigate: async (fv, meta) => {
            await homeDeps.getMounterMaterialSlotPairs({
                workOrderIdno: fv.workOrderIdno.trim(),
                productIdno: fv.productIdno.trim(),
                mounterIdno: fv.mounterIdno.trim(),
                boardSide: fv.workSheetSide!,
                machineSide: fv.machineSide,
                testingMode: meta.testingMode,
                testingProductIdno: meta.testingProductIdno,
            })
            router.push({
                path: `/smt/panasonic-mounter/${fv.mounterIdno.trim()}/${fv.workOrderIdno.trim()}`,
                query: {
                    work_sheet_side: fv.workSheetSide!,
                    machine_side: fv.machineSide!,
                    product_idno: fv.productIdno.trim(),
                    testing_mode: meta.testingMode ? '1' : null,
                    testing_product_idno: meta.testingProductIdno,
                },
            })
        },
    })
</script>



<template>
    <div style="padding: 1rem;">
        <n-h1 style="text-align: center;">Panasonic<br>打件機上料助手</n-h1>
        <n-space vertical size="large" style="padding: 1rem;">
            <n-form size="large" :model="formValue" :rules="rules" ref="formRef">
                <n-grid cols="1 s:3" responsive="screen">
                    <!-- 🧪 模式切換（合併開關與模式文字） -->
                    <n-gi></n-gi>
                    <n-form-item-gi label="模式切換 (試產生產 / 正式生產)">
                        <div class="flex items-center space-x-3 p-2">
                            <n-switch v-model:value="isTestingMode" @update:value="onToggleTestingMode" />
                            <span class="text-sm font-medium" :style="{ color: isTestingMode ? '#facc15' : '#4ade80' }">
                                {{ isTestingMode ? '🧪 試產生產模式' : '✅ 正式生產模式' }}
                            </span>
                        </div>
                    </n-form-item-gi>
                    <n-gi></n-gi>

                    <n-gi></n-gi>
                    <n-form-item-gi label="工單號" show-require-mark path="workOrderIdno">
                        <n-input type="text" size="large" autofocus v-model:value.lazy="formValue.workOrderIdno"
                            :input-props="{ id: 'workOrderIdnoInput' }" />
                    </n-form-item-gi>
                    <n-gi></n-gi>

                    <n-gi></n-gi>
                    <n-form-item-gi>
                        <n-checkbox v-model:checked="autoFillProductIdno">工單號自動帶入成品料號</n-checkbox>
                    </n-form-item-gi>
                    <n-gi></n-gi>

                    <n-gi></n-gi>
                    <n-form-item-gi label="成品料號" show-require-mark path="productIdno">
                        <n-input type="text" size="large" autofocus v-model:value.lazy="formValue.productIdno"
                            :input-props="{ id: 'productIdnoInput' }" />
                    </n-form-item-gi>
                    <n-gi></n-gi>

                    <n-gi></n-gi>
                    <n-form-item-gi label="線別" show-require-mark path="mounterIdno">
                        <n-select size="large" v-model:value="formValue.mounterIdno" :options="mounterOptions"
                            placeholder="請選擇線別" />
                    </n-form-item-gi>
                    <n-gi></n-gi>

                    <n-gi></n-gi>
                    <n-form-item-gi show-require-mark label="工件面向" path="workSheetSide">
                        <n-radio-group v-model:value.lazy="formValue.workSheetSide">
                            <n-radio-button v-for="worksheetSide in workSheetSideOptions" :label="worksheetSide.label"
                                :key="worksheetSide.label" :value="worksheetSide.value"></n-radio-button>
                        </n-radio-group>
                    </n-form-item-gi>
                    <n-gi></n-gi>

                    <n-gi></n-gi>
                    <n-form-item-gi show-require-mark label="機台面向" path="machineSide">
                        <n-radio-group v-model:value.lazy="formValue.machineSide">
                            <n-radio-button v-for="machineSide in machineSideOptions" :label="machineSide.label"
                                :key="machineSide.label" :value="machineSide.value"></n-radio-button>
                        </n-radio-group>
                    </n-form-item-gi>
                    <n-gi></n-gi>

                    <n-gi></n-gi>
                    <n-form-item-gi>
                        <n-button type="primary" block size="large" @click=" onClickSubmitButton($event)"
                            attr-type="submit">
                            確定</n-button>
                    </n-form-item-gi>
                    <n-gi></n-gi>
                </n-grid>
            </n-form>
        </n-space>
    </div>
</template>
