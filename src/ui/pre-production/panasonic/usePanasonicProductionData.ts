import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ApiError, type PanasonicMounterFileRead } from '@/client'
import { loadPanasonicProductionSlots } from '@/application/preproduction/PanasonicProductionLoadUseCase'
import type { ProductionRowModel } from '@/pages/mounter/panasonic/types/production'

export function usePanasonicProductionData() {
  const route = useRoute()
  const router = useRouter()

  const mounterData = ref<PanasonicMounterFileRead | null>(null)
  const rowData = ref<ProductionRowModel[]>([])
  const loading = ref(false)

  onMounted(async () => {
    loading.value = true
    try {
      mounterData.value =
        await loadPanasonicProductionSlots({
          workOrderIdno: String(route.params.workOrderIdno).trim(),
          mounterIdno: String(route.params.mounterIdno).trim(),
          productIdno: String(route.query.product_idno).trim(),
          boardSide: route.query.work_sheet_side as any,
          machineSide: route.query.machine_side as any,
          testingMode: route.query.testing_mode === '1',
          testingProductIdno: route.query.testing_product_idno
            ? String(route.query.testing_product_idno)
            : null
        })

      rowData.value =
        mounterData.value.panasonic_mounter_file_items.map(i => ({
          correct: null,
          id: i.id,
          slotIdno: i.slot_idno,
          subSlotIdno: i.sub_slot_idno,
          firstAppendTime: null,
          materialIdno: i.smd_model_idno,
          appendedMaterialInventoryIdno: '',
          materialInventoryIdno: ''
        }))
    } catch (e) {
      if (e instanceof ApiError && [404, 503].includes(e.status)) {
        router.push('/http-status/404')
      }
    } finally {
      loading.value = false
    }
  })

  return {
    loading,
    mounterData,
    rowData
  }
}
