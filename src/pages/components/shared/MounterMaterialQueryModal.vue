<script setup lang="ts">
import { watch } from 'vue'
import { NModal, NButton } from 'naive-ui'
import { AgGridVue } from 'ag-grid-vue3'
import type { GridOptions, GetRowIdParams } from 'ag-grid-community'
import { useDateFormatter } from '@/ui/shared/composables/useDateFormatter'
import type { MaterialQueryRowModel } from '@/domain/mounter/MaterialQueryRowModel'

export type { MaterialQueryRowModel }

const props = withDefaults(
  defineProps<{
    show: boolean
    rowData: MaterialQueryRowModel[]
    title?: string
    closable?: boolean
  }>(),
  {
    title: '接料查詢',
    closable: false,
  }
)

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'load'): void
}>()

const { format } = useDateFormatter()

const gridOptions: GridOptions = {
  columnDefs: [
    {
      field: 'correct',
      tooltipField: 'correct',
      headerName: '',
      flex: 1,
      minWidth: 60,
      refData: {
        MATCHED_MATERIAL_PACK: '✅',
        UNMATCHED_MATERIAL_PACK: '❌',
        TESTING_MATERIAL_PACK: '⚠️',
        UNCHECKED_MATERIAL_PACK: '',
      },
    },
    { field: 'slotIdno', tooltipField: 'slotIdno', headerName: '槽位', flex: 3, minWidth: 90 },
    { field: 'subSlotIdno', tooltipField: 'subSlotIdno', headerName: '副槽位', flex: 2, minWidth: 100 },
    { field: 'materialInventoryIdno', tooltipField: 'materialInventoryIdno', headerName: '物料條碼', flex: 5, minWidth: 140 },
    {
      field: 'materialInventoryType',
      tooltipField: 'materialInventoryType',
      headerName: '上料類型',
      flex: 5,
      minWidth: 140,
      refData: {
        NEW_MATERIAL_PACK: '新捲料',
        REUSED_MATERIAL_PACK: '接料',
        IMPORTED_MATERIAL_PACK: '匯入物料',
        INSPECTION_MATERIAL_PACK: '巡檢',
      },
    },
    {
      field: 'checktime',
      tooltipField: 'checktime',
      headerName: '時間',
      flex: 3,
      minWidth: 180,
      valueFormatter: (params) => format(params.value),
    },
    { field: 'operatorName', tooltipField: 'operatorName', headerName: '操作人員', flex: 5, minWidth: 140 },
    { field: 'remark', tooltipField: 'remark', headerName: '備註', flex: 5, minWidth: 140 },
  ],
  defaultColDef: { editable: false, filter: true, sortable: true, resizable: true },
  rowSelection: 'multiple',
  getRowId: (params: GetRowIdParams) => String(params.data.id),
}

watch(
  () => props.show,
  (val) => {
    if (val) {
      emit('load')
    }
  },
  { immediate: true }
)
</script>

<template>
  <n-modal
    :show="show"
    preset="dialog"
    :title="title"
    :closable="closable"
    :mask-closable="closable"
    :close-on-esc="closable"
    :style="{ width: '90vw', maxWidth: '1400px' }"
    @update:show="emit('update:show', $event)"
  >
    <div style="height: 350px; padding: 1rem;">
      <ag-grid-vue
        class="ag-theme-balham-dark"
        :rowData="rowData"
        :gridOptions="gridOptions"
        style="height: 100%;"
      ></ag-grid-vue>
    </div>
    <template #action>
      <n-button type="primary" @click="emit('update:show', false)">關閉</n-button>
    </template>
  </n-modal>
</template>
