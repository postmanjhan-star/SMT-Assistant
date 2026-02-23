import { computed, ref } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useDialog } from "naive-ui"
import { useAuthStore } from "@/stores/authStore"
import { useUiNotifier } from "@/ui/shared/composables/useUiNotifier"
import { useSlotResultNotifier } from "@/ui/shared/composables/useSlotResultNotifier"
import { useProductionState } from "@/ui/workflows/preproduction/panasonic/composables/useProductionState"
import { useRollShortageForm } from "@/ui/workflows/preproduction/panasonic/composables/useRollShortageForm"
import { usePanasonicProductionData } from "@/ui/workflows/preproduction/panasonic/composables/usePanasonicProductionData"
import { usePanasonicSlotFlow } from "@/ui/workflows/preproduction/panasonic/composables/usePanasonicSlotFlow"
import { useProductionGridBinding } from "@/ui/workflows/preproduction/panasonic/composables/useProductionGridBinding"
import { MaterialMatchingPolicy } from "@/domain/preproduction/MaterialMatchingPolicy"
import { parsePanasonicSlotIdno } from "@/domain/slot/PanasonicSlotParser"
import {
  SubmitRollShortageUseCase,
  type SubmitRollShortageError,
} from "@/application/preproduction/SubmitRollShortageUseCase"
import { SubmitSlotUseCase } from "@/application/preproduction/SubmitSlotUseCase"
import { ProductionLifecycleUseCase } from "@/application/preproduction/ProductionLifecycleUseCase"
import {
  createPreproductionPanasonicDeps,
  type PreproductionPanasonicDeps,
} from "@/application/panasonic/di/createPanasonicWorkflowDeps"
import { usePanasonicStatMap } from "@/ui/shared/composables/panasonic/usePanasonicStatMap"
import {
  PANASONIC_HOME_PATH,
  PANASONIC_MODE_NAME_TESTING,
} from "@/ui/shared/composables/panasonic/usePanasonicConstants"
import type {
  ProductionRowModel,
  SlotInputResult,
} from "@/pages/mounter/panasonic/types/production"

export type PanasonicDetailPageOptions = {
  onResetInputs: () => void
  getSlotInputResult: () => SlotInputResult | null
  autoUploadRows?: (rows: unknown[]) => void
  deps?: Partial<PreproductionPanasonicDeps>
}

function normalizeRouteValue(val: unknown): string {
  if (Array.isArray(val)) return String(val[0] ?? "").trim()
  return String(val ?? "").trim()
}

function toRollShortageErrorMessage(error: SubmitRollShortageError): string | null {
  switch (error.code) {
    case "materialInventoryIdno_required":
      return "請輸入物料號"
    case "slotIdno_required":
      return "請輸入槽位"
    case "type_required":
      return "請選擇物料類型"
    case "stat_not_found":
      return "找不到對應的槽位"
    case "row_not_found":
      return `找不到槽位 ${error.slotIdno}`
    case "no_material_in_grid":
      return "表格內無此物料"
    case "inventory_not_found":
      return "查無此條碼"
    case "erp_timeout":
      return "ERP 連線超時，請確認 ERP 連線"
    case "erp_bad_gateway":
      return "ERP 連線錯誤，請確認 ERP 連線"
    case "server_error":
      return "系統錯誤"
    case "unknown_api_error":
      return "未知錯誤"
    case "unknown_error":
      return "發生未知例外"
    default:
      return null
  }
}

export function usePanasonicDetailPage(options: PanasonicDetailPageOptions) {
  const route = useRoute()
  const router = useRouter()
  const dialog = useDialog()
  const deps = createPreproductionPanasonicDeps(options.deps)

  const authStore = useAuthStore()
  const currentUsername = computed(
    () =>
      authStore.authState.OAuth2PasswordBearer?.username ??
      authStore.authState.HTTPBasic?.value?.username ??
      ""
  )

  const ui = useUiNotifier()
  useSlotResultNotifier(ui)

  const isTestingMode = route.query.testing_mode === "1"
  const workOrderIdno = computed(() => normalizeRouteValue(route.params.workOrderIdno))
  const productIdno = computed(() => normalizeRouteValue(route.query.product_idno))
  const mounterIdno = computed(() => normalizeRouteValue(route.params.mounterIdno))
  const machineSideQuery = computed(() => normalizeRouteValue(route.query.machine_side))
  const workSheetSideQuery = computed(() =>
    normalizeRouteValue(route.query.work_sheet_side)
  )

  const { mounterData, rowData } = usePanasonicProductionData()
  const { gridApi, onGridReady } = useProductionGridBinding({
    resetInputs: options.onResetInputs,
  })

  const { getStatBySlotIdno } = usePanasonicStatMap({
    getItems: () => mounterData.value?.panasonic_mounter_file_items ?? [],
    parseSlotIdno: parsePanasonicSlotIdno,
  })

  const {
    productionStarted,
    productionUuid,
    start: startProduction,
    stop: stopProduction,
  } = useProductionState()

  const productionLifecycleUseCase = deps.createProductionLifecycleUseCase({
    start: startProduction,
    stop: stopProduction,
  })

  const {
    show: showRollShortageModal,
    formRef: rollShortageFormRef,
    formValue: rollShortageFormValue,
    rules: rollShortageRules,
    open: openRollShortage,
    close: closeRollShortage,
  } = useRollShortageForm()

  const rollTypeOptions = [
    { label: "接料", value: "roll" },
    { label: "新捲料", value: "new" },
  ]

  const { handleSlotSubmit: submitSlot } = usePanasonicSlotFlow<
    SlotInputResult | null,
    unknown
  >({
    isTestingMode,
    getResult: options.getSlotInputResult,
    autoUpload: (rows) => {
      options.autoUploadRows?.(rows)
    },
    onResetInputs: options.onResetInputs,
  })

  const submitSlotUseCase = deps.createSubmitSlotUseCase({ submitSlot })
  const submitRollShortageUseCase = deps.createSubmitRollShortageUseCase({
    repository: deps.createSmtRepository(),
    getRowData: () => rowData.value,
    getStatBySlotIdno,
    isTestingMode: () => isTestingMode,
    operatorId: () => currentUsername.value || null,
    now: deps.now,
  })

  const showMaterialQueryModal = ref(false)

  function onClickBackArrow() {
    router.push(PANASONIC_HOME_PATH)
  }

  function getMaterialMatchedRows(materialIdno: string): ProductionRowModel[] {
    return MaterialMatchingPolicy.filterUnboundRows(rowData.value, materialIdno)
  }

  function onRollShortage() {
    openRollShortage()
  }

  function onMaterialQuery() {
    showMaterialQueryModal.value = true
  }

  function resetRollShortageForm() {
    rollShortageFormValue.value = {
      materialInventoryIdno: "",
      slotIdno: "",
      type: "",
    }
  }

  function handleProductionStarted(productionStatUuid: string) {
    const intent = productionLifecycleUseCase.handleStarted({
      uuid: productionStatUuid,
      currentPath: route.path,
      currentQuery: route.query,
    })

    router.replace(intent.replace)
    router.push(intent.push)
  }

  async function onStopProduction() {
    dialog.warning({
      title: "結束生產確認",
      content: "確定要結束生產嗎？",
      positiveText: "確定",
      negativeText: "取消",
      onPositiveClick: async () => {
        await productionLifecycleUseCase.stop()
        return ui.success("生產已結束")
      },
      onNegativeClick: () => undefined,
    })
  }

  async function handleSlotSubmitWithPolicy(payload: {
    slotIdno: string
    slot: string
    subSlot: string
  }) {
    const result = await submitSlotUseCase.execute(payload)
    return result.success
  }

  async function onSubmitShortage() {
    try {
      await rollShortageFormRef.value?.validate()
    } catch {
      return
    }

    const result = await submitRollShortageUseCase.execute({
      materialInventoryIdno: rollShortageFormValue.value.materialInventoryIdno,
      slotIdno: rollShortageFormValue.value.slotIdno,
      type: rollShortageFormValue.value.type,
    })

    if (result.ok === false) {
      const message = toRollShortageErrorMessage(result.error)
      if (message) ui.error(message)
      return
    }

    if (result.info?.code === "testing_virtual_material") {
      ui.info(`${PANASONIC_MODE_NAME_TESTING}：使用物料 [廠商測試新料] ${result.info.idno}`)
    }

    const { row, rowId, newAppendedMaterialInventoryIdno } = result.update
    const materialRowNode = gridApi.value?.getRowNode(rowId)

    if (!materialRowNode) {
      ui.error(`找不到AG Grid 資料列 ${rowId}`)
      return
    }

    ui.success("新增成功")

    materialRowNode.setDataValue(
      "appendedMaterialInventoryIdno",
      newAppendedMaterialInventoryIdno
    )
    row.appendedMaterialInventoryIdno = newAppendedMaterialInventoryIdno

    closeRollShortage()
    resetRollShortageForm()
  }

  function onRollShortageModalUpdate(value: boolean) {
    if (!value) {
      closeRollShortage()
    }
  }

  return {
    isTestingMode,
    workOrderIdno,
    productIdno,
    mounterIdno,
    machineSideQuery,
    workSheetSideQuery,
    currentUsername,
    rowData,
    productionStarted,
    productionUuid,
    showRollShortageModal,
    rollShortageFormRef,
    rollShortageFormValue,
    rollShortageRules,
    rollTypeOptions,
    showMaterialQueryModal,
    onGridReady,
    onClickBackArrow,
    onStopProduction,
    handleProductionStarted,
    onRollShortage,
    onSubmitShortage,
    closeRollShortage,
    onMaterialQuery,
    handleSlotSubmitWithPolicy,
    onRollShortageModalUpdate,
    getMaterialMatchedRows,
    showError: ui.error,
  }
}
