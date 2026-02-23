import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ApiError,
  BoardSideEnum,
  CheckMaterialMatchEnum,
  MachineSideEnum,
  PanasonicMounterItemStatCreate,
  ProduceTypeEnum,
} from '@/client'
import { useDialog, type FormRules } from 'naive-ui'
import type { GridApi } from 'ag-grid-community'

import { useUiNotifier } from '@/ui/shared/composables/useUiNotifier'
import { usePanasonicProductionState } from '@/ui/workflows/post-production/panasonic/composables/usePanasonicProductionState'
import { usePostProductionFeedFlow } from '@/ui/shared/composables/usePostProductionFeedFlow'
import { PostProductionRecordUploader } from '@/application/post-production-feed/PostProductionRecordUploader'
import { PostProductionRecordApi } from '@/infra/post-production/PostProductionRecordApi'
import { useRollShortageForm } from '@/ui/shared/composables/useRollShortageForm'
import { usePostProductionFeedStore } from '@/stores/postProductionFeedStore'
import { startPanasonicProduction } from '@/application/panasonic/production/StartPanasonicProduction'
import type { ProductionRowModel } from '@/domain/production/buildPanasonicRowData'

export type PanasonicProductionPageOptions = {
  onResetInputs: () => void
}

export function usePanasonicProductionPage(options: PanasonicProductionPageOptions) {
  const route = useRoute()
  const router = useRouter()
  const dialog = useDialog()
  const ui = useUiNotifier()

  const normalizeRoute = (val: unknown) => String(val ?? '').trim()

  const productionUuid = ref('')
  const isTestingMode = ref(route.query.testing_mode === '1')

  const mounterIdno = computed(() => normalizeRoute(route.params.mounterIdno))
  const workOrderIdno = ref('')
  const productIdno = ref('')
  const boardSide = ref<BoardSideEnum | null>(null)
  const machineSide = ref<MachineSideEnum | null>(null)

  const machineSideLabel = computed(() => {
    if (machineSide.value === MachineSideEnum.FRONT) return '1'
    if (machineSide.value === MachineSideEnum.BACK) return '2'
    return ''
  })

  const postProductionFeedStore = usePostProductionFeedStore()

  const recordApi = new PostProductionRecordApi()
  const recordUploader = new PostProductionRecordUploader(recordApi)

  const inspectionUpload = (params: {
    stat_id: number
    inputSlot: string
    inputSubSlot: string
    materialInventory: { idno: string }
  }) =>
    recordUploader.uploadInspection({
      statId: params.stat_id,
      slotIdno: params.inputSlot,
      subSlotIdno: params.inputSubSlot,
      materialPackCode: params.materialInventory.idno,
    })

  const appendedMaterialUpload = (params: {
    stat_id: number
    inputSlot: string
    inputSubSlot: string
    materialInventory?: { idno: string } | null
    correctState?: 'true' | 'false' | 'warning' | null
  }) => {
    const materialPackCode = params.materialInventory?.idno
    if (!materialPackCode) {
      throw new Error('materialInventory is required')
    }

    return recordUploader.uploadAppend({
      statId: params.stat_id,
      slotIdno: params.inputSlot,
      subSlotIdno: params.inputSubSlot,
      materialPackCode,
      correctState: params.correctState ?? null,
      feedMaterialPackType: 'new',
    })
  }

  const { mounterData, rowData, productionStarted, load } =
    usePanasonicProductionState(productionUuid)

  const gridApi = ref<GridApi | null>(null)
  const onGridReady = (params: { api: GridApi }) => {
    gridApi.value = params.api
  }

  const { submit: submitPostProductionFeed } = usePostProductionFeedFlow<ProductionRowModel>({
    gridApi,
    rowData,
    ui: {
      success: ui.success,
      warn: ui.warn,
      info: ui.info,
      error: ui.error,
      notifyError: ui.notifyError,
      playErrorTone: ui.playErrorTone,
      resetSlotMaterialFormInputs: options.onResetInputs,
    },
    getMounterData: () => mounterData.value,
    isTestingMode: () => isTestingMode.value,
    isProductionStarted: () => productionStarted.value,
    resetMaterialScan: options.onResetInputs,
    inspectionUpload,
    appendedMaterialUpload,
  })

  const handleSlotSubmit = async ({
    slot,
    subSlot,
    slotIdno,
  }: {
    slot: string
    subSlot: string
    slotIdno: string
  }) => {
    let success = false
    try {
      success = await submitPostProductionFeed({
        slot,
        subSlot,
        slotIdno,
        result: postProductionFeedStore.materialResult,
      })
      return success
    } finally {
      options.onResetInputs()
    }
  }

  const rollTypeOptions = [
    { label: '接料', value: 'roll' },
    { label: '新捲料', value: 'new' },
  ]

  const rollShortageRules: FormRules = {
    materialInventoryIdno: {
      required: true,
      message: '請輸入單包條碼',
      trigger: ['blur'],
    },
    slotIdno: { required: true, message: '請輸入槽位', trigger: ['blur'] },
    type: {
      required: true,
      message: '請選擇接料類型',
      trigger: ['change'],
    },
  }

  const {
    rollShortageFormRef,
    rollShortageFormValue,
    showRollShortageModal,
    onRollShortage,
    onSubmitShortage,
    getMaterialMatchedRows: getMaterialMatchedRowArray,
  } = useRollShortageForm<ProductionRowModel>({
    getMounterData: () => mounterData.value,
    getRowData: () => rowData.value,
    isTestingMode: () => isTestingMode.value,
  })

  const closeRollShortage = () => {
    postProductionFeedStore.closeRollShortageModal()
  }

  const showMaterialQueryModal = ref(false)

  const onMaterialQuery = () => {
    if (!productionUuid.value) {
      ui.error('尚未取得生產 UUID')
      return
    }
    showMaterialQueryModal.value = true
  }

  const onClickBackArrow = () => {
    router.push('/smt/panasonic-mounter/')
  }

  const convertProduceMode = (value: boolean | null): ProduceTypeEnum | null =>
    value as unknown as ProduceTypeEnum

  const convertBoardSide = (value: string | null): BoardSideEnum | null =>
    value as unknown as BoardSideEnum

  const onProduction = () => {
    const invalid = rowData.value.filter((row) => {
      if (row.correct === CheckMaterialMatchEnum.UNMATCHED_MATERIAL_PACK) return true
      if (!isTestingMode.value && row.correct == null) return true
      return false
    })

    if (invalid.length > 0) {
      return ui.error('尚有槽位未綁定或錯誤，無法開始生產')
    }

    dialog.warning({
      title: '開始生產確認',
      content: '確定要開始生產嗎？',
      positiveText: '確定',
      negativeText: '取消',
      onPositiveClick: () => startProductionUpload(isTestingMode.value),
      onNegativeClick: () => {},
    })
  }

  const startProductionUpload = async (testing: boolean) => {
    const machineSideValue = normalizeRoute(route.query.machine_side)
    machineSide.value =
      machineSideValue === '1'
        ? MachineSideEnum.FRONT
        : machineSideValue === '2'
          ? MachineSideEnum.BACK
          : null

    boardSide.value = convertBoardSide(
      normalizeRoute(route.query.work_sheet_side ?? null)
    )

    try {
      const payload: PanasonicMounterItemStatCreate[] = rowData.value.map((row) => ({
        operator_id: null,
        operation_time: row.firstAppendTime
          ? new Date(row.firstAppendTime).toISOString()
          : new Date().toISOString(),
        production_start: new Date().toISOString(),
        work_order_no: normalizeRoute(route.params.workOrderIdno ?? null),
        product_idno: normalizeRoute(route.query.product_idno),
        machine_idno: mounterIdno.value,
        machine_side: machineSide.value,
        board_side: boardSide.value,
        slot_idno: row.slotIdno,
        sub_slot_idno: row.subSlotIdno ?? null,
        material_idno: row.materialIdno ?? null,
        material_pack_code: row.materialInventoryIdno ?? null,
        produce_mode: convertProduceMode(testing),
        check_pack_code_match: row.correct,
      }))

      await startPanasonicProduction(payload)

      ui.success('開始生產，資料已上傳')
      productionStarted.value = true

      router.replace({
        path: route.path,
        query: {
          ...route.query,
        },
      })
    } catch (err) {
      console.error('upload failed: ', err)
      ui.error('上傳失敗')
    }
  }

  const handleProductionStopped = () => {
    productionStarted.value = false
    ui.success('生產已結束')
    router.push('/smt/panasonic-mounter/')
  }

  onMounted(async () => {
    postProductionFeedStore.clearMaterialResult()
    postProductionFeedStore.closeRollShortageModal()

    try {
      productionUuid.value = normalizeRoute(route.params.productionUuid)
      const { mounterData: loadedStats } = await load()

      const firstStat = loadedStats[0]
      if (!firstStat) return

      workOrderIdno.value = firstStat.work_order_no
      productIdno.value = firstStat.product_idno
      machineSide.value = firstStat.machine_side
      boardSide.value = firstStat.board_side

      if (!isTestingMode.value) {
        isTestingMode.value =
          firstStat.produce_mode === ProduceTypeEnum.TESTING_PRODUCE_MODE
      }
    } catch (error) {
      if (error instanceof ApiError) {
        router.push('/http-status/404')
      }
    }
  })

  return {
    productionUuid,
    isTestingMode,
    mounterIdno,
    mounterData,
    rowData,
    productionStarted,
    workOrderIdno,
    productIdno,
    boardSide,
    machineSideLabel,
    onGridReady,
    onProduction,
    handleProductionStopped,
    handleSlotSubmit,
    rollShortageFormRef,
    rollShortageFormValue,
    showRollShortageModal,
    rollShortageRules,
    rollTypeOptions,
    onRollShortage,
    onSubmitShortage,
    closeRollShortage,
    getMaterialMatchedRowArray,
    showMaterialQueryModal,
    onMaterialQuery,
    onClickBackArrow,
    ui,
  }
}
