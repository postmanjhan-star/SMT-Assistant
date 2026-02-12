<script setup lang="ts">
import "ag-grid-community/styles/ag-grid.css"
import "ag-grid-community/styles/ag-theme-balham.css"
import { AgGridVue } from "ag-grid-vue3"
import {
  NButton,
  NForm,
  NFormItem,
  NGi,
  NGrid,
  NInput,
  NModal,
  NP,
  NPageHeader,
  NRadioButton,
  NRadioGroup,
  NSpace,
  NTag,
} from 'naive-ui'
import { reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useMeta } from 'vue-meta'

import MaterialQueryModal from "./components/MaterialQueryModal.vue"
import StopProductionButton from "./components/StopProductionButton.vue"
import MaterialInventoryBarcodeInput from "@/pages/components/MaterialInventoryBarcodeInput.vue"
import SlotIdnoInput from "@/pages/components/SlotIdnoInput.vue"
import { usePostProductionFeedStore } from '@/stores/postProductionFeedStore'
import { useSlotInputSelection } from '@/ui/shared/composables/useSlotInputSelection'
import { usePanasonicProductionPage } from '@/ui/post-production/panasonic/usePanasonicProductionPage'
import { createPanasonicProductionGrid } from '@/ui/post-production/panasonic/PanasonicProductionGridAdapter'
import { parsePanasonicSlotIdno } from '@/domain/slot/PanasonicSlotParser'

useMeta({ title: 'Panasonic Mounter Assistant' })

const slotIdnoInput = ref<{ focus: () => void } | null>(null)
const store = usePostProductionFeedStore()
const { materialResult } = storeToRefs(store)
const inputs = useSlotInputSelection({
  materialResult,
  focusSlotInput: () => slotIdnoInput.value?.focus(),
  setMaterialResult: store.setMaterialResult,
  clearMaterialResult: store.clearMaterialResult,
})
const rawPage = usePanasonicProductionPage({
  onResetInputs: inputs.onSlotSubmitted,
})
const rollShortageFormRef = rawPage.rollShortageFormRef
const page = reactive(rawPage)
const gridOptions = createPanasonicProductionGrid()

function handleMaterialMatched(payload: { materialInventory: any; matchedRows: any[] }) {
  inputs.onMaterialMatched({
    success: true,
    materialInventory: payload.materialInventory,
    matchedRows: payload.matchedRows,
  })
}
</script>

<template>
  <!-- 單捲不足 Modal -->
  <n-modal
    v-model:show="page.showRollShortageModal"
    preset="dialog"
    title="單捲不足"
    closable
    mask-closable
    close-on-esc
  >
    <n-form
      :model="page.rollShortageFormValue"
      :rules="page.rollShortageRules"
      label-placement="top"
      ref="rollShortageFormRef"
    >
      <n-form-item show-require-mark label="單包條碼" path="materialInventoryIdno">
        <n-input
          type="text"
          v-model:value.lazy="page.rollShortageFormValue.materialInventoryIdno"
          placeholder="請輸入條碼"
        ></n-input>
      </n-form-item>

      <n-form-item show-require-mark label="槽位" path="slotIdno">
        <n-input
          type="text"
          v-model:value.lazy="page.rollShortageFormValue.slotIdno"
          placeholder="請輸入槽位"
        ></n-input>
      </n-form-item>

      <n-form-item show-require-mark label="接料類型" path="type">
        <n-radio-group v-model:value.lazy="page.rollShortageFormValue.type">
          <n-radio-button
            v-for="rollType in page.rollTypeOptions"
            :key="rollType.value"
            :label="rollType.label"
            :value="rollType.value"
          ></n-radio-button>
        </n-radio-group>
      </n-form-item>
    </n-form>

    <template #action>
      <n-space>
        <n-button @click="page.closeRollShortage">取消</n-button>
        <n-button type="primary" @click="page.onSubmitShortage">確定</n-button>
      </n-space>
    </template>
  </n-modal>
  <!-- 接料查詢 Modal -->
  <MaterialQueryModal
    v-model:show="page.showMaterialQueryModal"
    :uuid="page.productionUuid"
    @error="page.ui.error"
  />

  <n-space vertical :wrap-item="false" style="height: calc(100vh - 60px);">
    <n-space
      vertical
      size="small"
      style="
        padding: 0px 1rem 0 1rem;
        position: sticky;
        top: 0px;
        background-color: var(--table-color);
        z-index: 1;
      "
    >
      <n-page-header @back="page.onClickBackArrow" style="margin-bottom: 1rem;">
        <template #title>
          <div style="display: flex; align-items: center; gap: 8px; white-space: nowrap;">
            <span>{{ page.mounterIdno }}</span>
            <n-tag :type="page.isTestingMode ? 'warning' : 'success'" size="small" bordered>
              {{ page.isTestingMode ? '🧪 試產生產模式' : '✅ 正式生產模式' }}
            </n-tag>
          </div>
        </template>
        <template #default>
          <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
            <n-space size="small">
              <n-p>工單：<n-tag type="info" size="small">{{ page.workOrderIdno }}</n-tag></n-p>
              <n-p>成品料號：<n-tag type="info" size="small">{{ page.productIdno }}</n-tag></n-p>
              <n-p>工件面向：<n-tag type="info" size="small">{{ page.boardSide }}</n-tag></n-p>
              <n-p>機台面向：<n-tag type="info" size="small">{{ page.machineSideLabel }}</n-tag></n-p>
            </n-space>

            <n-space size="small">
              <n-button
                v-if="!page.productionStarted"
                type="success"
                size="small"
                @click="page.onProduction"
                :disabled="!page.productionStarted"
              >
                ▶️ 開始生產
              </n-button>
              <StopProductionButton
                v-else
                :uuid="page.productionUuid"
                @stopped="page.handleProductionStopped"
                @error="page.ui.error"
              />
              <n-button type="warning" size="small" @click="page.onRollShortage" :disabled="!page.productionStarted">
                ⚠️ 單捲不足
              </n-button>
              <n-button type="info" size="small" @click="page.onMaterialQuery">
                🔍 接料查詢
              </n-button>
            </n-space>
          </div>
        </template>
      </n-page-header>

      <n-grid cols="2 s:2" responsive="screen" x-gap="20">
        <n-gi>
          <MaterialInventoryBarcodeInput
            :disabled="!page.productionStarted"
            :is-testing-mode="page.isTestingMode"
            :get-material-matched-rows="page.getMaterialMatchedRowArray"
            @matched="handleMaterialMatched"
            :reset-key="inputs.resetKey.value"
            @error="page.ui.error"
          />
        </n-gi>

        <n-gi>
          <SlotIdnoInput
            :disabled="!page.productionStarted"
            :is-testing-mode="page.isTestingMode"
            :has-material="inputs.hasMaterial.value"
            :parse-slot-idno="parsePanasonicSlotIdno"
            :reset-key="inputs.slotResetKey.value"
            ref="slotIdnoInput"
            @submit="page.handleSlotSubmit"
            @error="page.ui.error"
          />
        </n-gi>
      </n-grid>
    </n-space>

    <div style="height: 2000px; padding: 1rem;">
      <ag-grid-vue
        class="ag-theme-balham-dark"
        :rowData="page.rowData"
        style="height: 100%;"
        :gridOptions="gridOptions"
        @grid-ready="page.onGridReady"
      >
      </ag-grid-vue>
    </div>
  </n-space>
</template>

<style>
body {
  /* This does not work. */
  margin-block-end: env(keyboard-inset-height, 5000px);
}
</style>
