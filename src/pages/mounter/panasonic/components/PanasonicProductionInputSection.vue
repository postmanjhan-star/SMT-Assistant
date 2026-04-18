<script setup lang="ts">
type RefBinder = (el: Element | null) => void

const props = defineProps<{
  column: "material" | "slot"
  isUnloadMode: boolean
  isIpqcMode: boolean
  isSpliceMode: boolean
  productionStarted: boolean
  // unload
  unloadMaterialLabel?: string
  unloadMaterialPlaceholder?: string
  isUnloadMaterialInputDisabled?: boolean
  unloadSlotLabel?: string
  unloadSlotPlaceholder?: string
  isUnloadSlotInputDisabled?: boolean
  // splice
  isSpliceNewPhase?: boolean
  isSpliceSlotPhase?: boolean
  spliceSlotIdno?: string
  // values
  unloadMaterialValue?: string
  unloadSlotValue?: string
  ipqcMaterialValue?: string
  ipqcSlotValue?: string
  spliceMaterialValue?: string
  spliceSlotValue?: string
  // ref binders
  bindUnloadMaterialInput?: RefBinder
  bindUnloadSlotInput?: RefBinder
  bindIpqcMaterialInput?: RefBinder
  bindIpqcSlotInput?: RefBinder
  bindSpliceMaterialInput?: RefBinder
  bindSpliceSlotInput?: RefBinder
}>()

const emit = defineEmits<{
  "update:unloadMaterialValue": [value: string]
  "update:unloadSlotValue": [value: string]
  "update:ipqcMaterialValue": [value: string]
  "update:ipqcSlotValue": [value: string]
  "update:spliceMaterialValue": [value: string]
  "update:spliceSlotValue": [value: string]
  "unloadMaterialEnter": []
  "unloadSlotSubmit": []
  "ipqcMaterialSubmit": []
  "ipqcSlotSubmit": []
  "spliceMaterialEnter": []
  "spliceSlotEnter": []
}>()
</script>

<template>
  <!-- ── Material column ─────────────────────────────────────────────────── -->
  <template v-if="column === 'material'">
    <div v-if="isUnloadMode" class="unload-mode-input">
      <label class="input-label" for="panasonic-prod-unload-material-input">{{ unloadMaterialLabel }}</label>
      <input
        id="panasonic-prod-unload-material-input"
        data-testid="unload-material-input"
        :ref="bindUnloadMaterialInput"
        :value="unloadMaterialValue"
        type="text"
        class="material-input"
        :placeholder="unloadMaterialPlaceholder"
        :disabled="isUnloadMaterialInputDisabled"
        @input="emit('update:unloadMaterialValue', ($event.target as HTMLInputElement).value)"
        @keydown.enter.prevent="emit('unloadMaterialEnter')"
      />
    </div>
    <div v-else-if="isIpqcMode" class="ipqc-mode-input">
      <label class="input-label" for="panasonic-prod-ipqc-material-input">覆檢物料條碼</label>
      <input
        id="prod-ipqc-material-input"
        :ref="bindIpqcMaterialInput"
        :value="ipqcMaterialValue"
        type="text"
        class="material-input"
        placeholder="請掃描物料條碼"
        @input="emit('update:ipqcMaterialValue', ($event.target as HTMLInputElement).value)"
        @keydown.enter.prevent="emit('ipqcMaterialSubmit')"
      />
    </div>
    <div v-else-if="isSpliceMode" class="splice-mode-input">
      <label class="input-label" for="panasonic-prod-splice-material-input">
        {{ isSpliceNewPhase ? '接料捲號' : '已上料捲號' }}
      </label>
      <input
        id="panasonic-prod-splice-material-input"
        :ref="bindSpliceMaterialInput"
        :value="spliceMaterialValue"
        type="text"
        class="material-input"
        data-testid="panasonic-splice-material-input"
        :disabled="!productionStarted"
        :placeholder="isSpliceNewPhase ? '請掃描要接料的新捲號' : '請掃描已上料的舊捲號'"
        @input="emit('update:spliceMaterialValue', ($event.target as HTMLInputElement).value)"
        @keydown.enter.prevent="emit('spliceMaterialEnter')"
      />
    </div>
  </template>

  <!-- ── Slot column ────────────────────────────────────────────────────── -->
  <template v-else>
    <div v-if="isUnloadMode" class="unload-mode-input">
      <label class="input-label" for="panasonic-prod-unload-slot-input">{{ unloadSlotLabel }}</label>
      <input
        id="panasonic-prod-unload-slot-input"
        data-testid="unload-slot-input"
        :ref="bindUnloadSlotInput"
        :value="unloadSlotValue"
        type="text"
        class="slot-input"
        :placeholder="unloadSlotPlaceholder"
        :disabled="isUnloadSlotInputDisabled"
        @input="emit('update:unloadSlotValue', ($event.target as HTMLInputElement).value)"
        @keydown.enter.prevent="emit('unloadSlotSubmit')"
      />
    </div>
    <div v-else-if="isIpqcMode" class="ipqc-mode-input">
      <label class="input-label" for="panasonic-prod-ipqc-slot-input">覆檢站位</label>
      <input
        id="prod-ipqc-slot-input"
        :ref="bindIpqcSlotInput"
        :value="ipqcSlotValue"
        type="text"
        class="slot-input"
        placeholder="請掃描站位"
        :disabled="!(ipqcMaterialValue ?? '').trim()"
        @input="emit('update:ipqcSlotValue', ($event.target as HTMLInputElement).value)"
        @keydown.enter.prevent="emit('ipqcSlotSubmit')"
      />
    </div>
    <div v-else-if="isSpliceMode" class="splice-mode-input">
      <label class="input-label" for="panasonic-prod-splice-slot-input">確認站位</label>
      <input
        id="panasonic-prod-splice-slot-input"
        :ref="bindSpliceSlotInput"
        :value="spliceSlotValue"
        type="text"
        class="slot-input"
        data-testid="panasonic-splice-slot-input"
        :disabled="!productionStarted || !isSpliceSlotPhase"
        :placeholder="isSpliceSlotPhase ? `請掃描站位 ${spliceSlotIdno}` : '請先掃描舊料捲號'"
        @input="emit('update:spliceSlotValue', ($event.target as HTMLInputElement).value)"
        @keydown.enter.prevent="emit('spliceSlotEnter')"
      />
    </div>
  </template>
</template>

<style scoped>
.unload-mode-input {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background-color: #f5f5f5;
  border-radius: 4px;
  border: 2px solid #1890ff;
}

.input-label {
  font-size: 12px;
  font-weight: 600;
  color: #1890ff;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.material-input,
.slot-input {
  padding: 10px 12px;
  font-size: 14px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-family: monospace;
  background-color: #ffffff;
  color: #333333;
  transition: border-color 0.3s;
  width: 100%;
  box-sizing: border-box;
}

.material-input:focus,
.slot-input:focus {
  outline: none;
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.slot-input:disabled,
.material-input:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
  color: #bfbfbf;
}

.ipqc-mode-input {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background-color: #fff7e6;
  border-radius: 4px;
  border: 2px solid #fa8c16;
}

.ipqc-mode-input .input-label {
  color: #fa8c16;
}

.splice-mode-input {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background-color: #fff0f6;
  border-radius: 4px;
  border: 2px solid #eb2f96;
}

.splice-mode-input .input-label {
  color: #eb2f96;
}

.splice-mode-input .material-input:focus,
.splice-mode-input .slot-input:focus {
  border-color: #eb2f96;
  box-shadow: 0 0 0 2px rgba(235, 47, 150, 0.2);
}
</style>
