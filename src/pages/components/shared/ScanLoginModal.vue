<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { NModal, NButton, NInput } from 'naive-ui'

const props = defineProps<{
  show: boolean
  loginInput: string
  loginError: string
  isLoginLoading: boolean
  isLoginRequired: boolean
  currentUsername: string
}>()

const emit = defineEmits<{
  'update:loginInput': [value: string]
  close: []
  submit: []
}>()

const inputRef = ref<{ focus: () => void } | null>(null)

watch(() => props.show, (val) => {
  if (val) nextTick(() => inputRef.value?.focus())
})
</script>

<template>
  <n-modal
    :show="show"
    :mask-closable="!isLoginRequired"
    :close-on-esc="!isLoginRequired"
    :closable="!isLoginRequired"
    @update:show="(v) => { if (!v && !isLoginRequired) emit('close') }"
    preset="card"
    style="width: 420px"
    title="掃碼登入"
  >
    <div data-testid="scan-login-modal">
      <div style="margin-bottom: 8px; color: #aaa; font-size: 13px">
        目前使用者：{{ currentUsername || '（未登入）' }}
      </div>
      <n-input
        ref="inputRef"
        :value="loginInput"
        placeholder="請掃描操作員條碼"
        :disabled="isLoginLoading"
        data-testid="scan-login-input"
        @update:value="emit('update:loginInput', $event)"
        @keydown.enter.prevent="emit('submit')"
      />
      <div
        v-if="loginError"
        style="color: #e88080; margin-top: 6px; font-size: 13px"
        data-testid="scan-login-error"
      >{{ loginError }}</div>
    </div>
    <template #footer>
      <n-button v-if="!isLoginRequired" @click="emit('close')">取消</n-button>
      <n-button type="primary" :loading="isLoginLoading" @click="emit('submit')">登入</n-button>
    </template>
  </n-modal>
</template>
