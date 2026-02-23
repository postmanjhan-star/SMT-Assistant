<script setup lang="ts">
import {
  NButton,
  NForm,
  NFormItem,
  NInput,
  NModal,
  NRadioButton,
  NRadioGroup,
  NSpace,
  type FormInst,
  type FormRules,
} from "naive-ui"
import type { Ref, VNodeRef } from "vue"

export type PanasonicRollShortageFormValue = {
  materialInventoryIdno: string
  slotIdno: string
  type: string
}

type RollTypeOption = {
  label: string
  value: string
}

const props = defineProps<{
  show: boolean
  formValue: PanasonicRollShortageFormValue
  rules: FormRules
  rollTypeOptions: RollTypeOption[]
  formRef?: Ref<FormInst | null>
}>()

const emit = defineEmits<{
  (e: "update:show", value: boolean): void
  (e: "submit"): void
  (e: "cancel"): void
}>()

function onUpdateShow(value: boolean) {
  emit("update:show", value)
}

function isFormInst(value: unknown): value is FormInst {
  return !!value && typeof value === "object" && "validate" in value
}

const setFormRef: VNodeRef = (value) => {
  if (!props.formRef) return
  props.formRef.value = isFormInst(value) ? value : null
}
</script>

<template>
  <n-modal
    :show="show"
    @update:show="onUpdateShow"
    preset="dialog"
    title="單捲不足"
    closable
    mask-closable
    close-on-esc
  >
    <n-form :model="formValue" :rules="rules" label-placement="top" :ref="setFormRef">
      <n-form-item show-require-mark label="單包條碼" path="materialInventoryIdno">
        <n-input
          type="text"
          v-model:value.lazy="formValue.materialInventoryIdno"
          placeholder="請輸入條碼"
        />
      </n-form-item>

      <n-form-item show-require-mark label="槽位" path="slotIdno">
        <n-input type="text" v-model:value.lazy="formValue.slotIdno" placeholder="請輸入槽位" />
      </n-form-item>

      <n-form-item show-require-mark label="接料類型" path="type">
        <n-radio-group v-model:value.lazy="formValue.type">
          <n-radio-button
            v-for="rollType in rollTypeOptions"
            :key="rollType.value"
            :label="rollType.label"
            :value="rollType.value"
          />
        </n-radio-group>
      </n-form-item>
    </n-form>

    <template #action>
      <n-space>
        <n-button @click="emit('cancel')">取消</n-button>
        <n-button type="primary" @click="emit('submit')">確定</n-button>
      </n-space>
    </template>
  </n-modal>
</template>
