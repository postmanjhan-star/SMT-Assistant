import { computed, onMounted, ref } from "vue"
import { useRoute, useRouter } from "vue-router"
import { ApiError } from "@/application/shared/clientTypes"
import { CheckMaterialMatchEnum } from "@/application/post-production-feed/clientTypes"
import {
  FeedMaterialTypeEnum,
  MachineSideEnum,
  ProduceTypeEnum,
} from "@/application/preproduction/clientTypes"
import type { BoardSideEnum } from "@/application/preproduction/clientTypes"
import { useDialog, type FormRules } from "naive-ui"
import type { GridApi } from "ag-grid-community"

import { useUiNotifier } from "@/ui/shared/composables/useUiNotifier"
import { usePanasonicProductionState } from "@/ui/workflows/post-production/panasonic/composables/usePanasonicProductionState"
import { usePanasonicProductionStart } from "@/ui/workflows/post-production/panasonic/composables/usePanasonicProductionStart"
import { usePanasonicMaterialQueryState } from "@/ui/workflows/post-production/panasonic/composables/usePanasonicMaterialQueryState"
import { useRollShortageForm } from "@/ui/shared/composables/useRollShortageForm"
import { usePostProductionFeedStore } from "@/stores/postProductionFeedStore"
import { useCurrentUsername } from "@/ui/shared/composables/useCurrentUsername"
import type { ProductionRowModel } from "@/domain/production/buildPanasonicRowData"
import {
  createPostproductionPanasonicDeps,
  type PostproductionPanasonicDeps,
} from "@/ui/di/panasonic/createPanasonicWorkflowDeps"
import {
  PANASONIC_HOME_PATH,
  PANASONIC_NOT_FOUND_PATH,
} from "@/ui/shared/composables/panasonic/usePanasonicConstants"
import { useMounterPostProductionWorkflowCore } from "@/ui/workflows/post-production/shared/composables/useMounterPostProductionWorkflowCore"
import {
  mapCorrectStateToEnum,
  mapTestingModeToProduceType,
  normalizeRoute,
} from "@/ui/workflows/post-production/shared/composables/productionWorkflowHelpers"
import { msg } from "@/ui/shared/messageCatalog"

export { mapTestingModeToProduceType }

export type PanasonicProductionWorkflowOptions = {
  onResetInputs: () => void
  isMockMode?: boolean
  deps?: Partial<PostproductionPanasonicDeps>
}

export function usePanasonicProductionWorkflow(
  options: PanasonicProductionWorkflowOptions
) {
  const route = useRoute()
  const router = useRouter()
  const dialog = useDialog()
  const ui = useUiNotifier()
  const deps = createPostproductionPanasonicDeps(options.deps)
  const { currentUsername, currentOperatorIdno } = useCurrentUsername()

  const productionUuid = ref("")
  const isTestingMode = ref(route.query.testing_mode === "1")
  const machineSideQuery = computed(() => normalizeRoute(route.query.machine_side))

  const mounterIdno = computed(() => normalizeRoute(route.params.mounterIdno))
  const workOrderIdno = ref("")
  const productIdno = ref("")
  const boardSide = ref<BoardSideEnum | null>(null)
  const machineSide = ref<MachineSideEnum | null>(null)

  const machineSideFromRows = computed(() => {
    let hasFront = false
    let hasBack = false

    rowData.value.forEach((row) => {
      const slotIdno = String(row.slotIdno ?? "").trim()
      if (!slotIdno) return

      if (slotIdno.startsWith("1")) hasFront = true
      if (slotIdno.startsWith("2")) hasBack = true
    })

    if (hasFront && hasBack) return "1+2"
    if (hasFront) return "1"
    if (hasBack) return "2"
    return ""
  })

  const machineSideLabel = computed(() => {
    if (machineSideFromRows.value) return machineSideFromRows.value
    if (machineSide.value === MachineSideEnum.FRONT) return "1"
    if (machineSide.value === MachineSideEnum.BACK) return "2"
    if (machineSideQuery.value === "1+2") return "1+2"
    if (machineSideQuery.value === "1") return "1"
    if (machineSideQuery.value === "2") return "2"
    return ""
  })

  const postProductionFeedStore = usePostProductionFeedStore()

  const recordApi = deps.createRecordApi()
  const recordUploader = deps.createRecordUploader(recordApi)

  const inspectionUpload = async (params: {
    stat_id: number
    inputSlot: string
    inputSubSlot: string
    materialInventory: { idno: string }
    checkPackCodeMatch?: CheckMaterialMatchEnum | null
  }): Promise<void> => {
    await recordUploader.uploadInspection({
      statId: params.stat_id,
      slotIdno: params.inputSlot,
      subSlotIdno: params.inputSubSlot,
      materialPackCode: params.materialInventory.idno,
      operatorId: currentUsername.value || null,
      checkPackCodeMatch: params.checkPackCodeMatch,
    })
  }

  const appendedMaterialUpload = async (params: {
    stat_id: number
    inputSlot: string
    inputSubSlot: string
    materialInventory?: { idno: string } | null
    correctState?: "true" | "false" | "warning" | null
  }): Promise<void> => {
    const materialPackCode = params.materialInventory?.idno
    if (!materialPackCode) {
      throw new Error("materialInventory is required")
    }

    const enumCorrectState = mapCorrectStateToEnum(params.correctState)

    await recordUploader.uploadAppend({
      statId: params.stat_id,
      slotIdno: params.inputSlot,
      subSlotIdno: params.inputSubSlot,
      materialPackCode,
      correctState: enumCorrectState,
      feedMaterialPackType: FeedMaterialTypeEnum.NEW_MATERIAL_PACK,
      operatorId: currentUsername.value || null,
    })
  }

  const { mounterData, rowData, productionStarted, load } =
    usePanasonicProductionState(productionUuid)

  const gridApi = ref<GridApi | null>(null)
  const onGridReady = (params: { api: GridApi }) => {
    gridApi.value = params.api
  }

  // ── Panasonic slot strategy ────────────────────────────────────────────────

  function parseUnloadSlotInput(
    rawSlot: string
  ): { slot: string; subSlot: string | null } | null {
    const trimmed = rawSlot.trim()
    if (!trimmed) return null

    const parts = trimmed.split("-")
    if (parts.length > 2) return null

    const slot = String(parts[0] ?? "").trim()
    if (!slot) return null

    const subSlotPart = String(parts[1] ?? "").trim()
    return {
      slot,
      subSlot: subSlotPart ? subSlotPart : null,
    }
  }

  function getStatBySlotInput(slotInput: string) {
    const parsed = parseUnloadSlotInput(slotInput)
    if (!parsed) {
      return { ok: false as const, error: "槽位格式錯誤" }
    }

    const bySlot = mounterData.value.filter(
      (stat) => String(stat.slot_idno ?? "").trim() === parsed.slot
    )

    if (bySlot.length === 0) {
      return { ok: false as const, error: `找不到槽位 ${slotInput}` }
    }

    if (!parsed.subSlot) {
      if (bySlot.length > 1) {
        return {
          ok: false as const,
          error: `槽位 ${parsed.slot} 有多個子槽位，請輸入完整格式（例如 ${parsed.slot}-L）`,
        }
      }
      return { ok: true as const, stat: bySlot[0] }
    }

    const matched = bySlot.find(
      (stat) => String(stat.sub_slot_idno ?? "").trim() === parsed.subSlot
    )
    if (!matched) {
      return { ok: false as const, error: `找不到槽位 ${parsed.slot}-${parsed.subSlot}` }
    }

    return { ok: true as const, stat: matched }
  }

  function toRowSlotIdno(row: ProductionRowModel): string {
    const slot = String(row.slotIdno ?? "").trim()
    const subSlot = String(row.subSlotIdno ?? "").trim()
    return subSlot ? `${slot}-${subSlot}` : slot
  }

  const panasonicSlotStrategy = {
    resolveSlot(slotIdno: string) {
      const statResult = getStatBySlotInput(slotIdno)
      if (!statResult.ok) return { ok: false as const, error: statResult.error }

      const stat = statResult.stat
      const row = rowData.value.find((r) => r.id === stat.id)
      if (!row) return { ok: false as const, error: `找不到槽位 ${slotIdno}` }

      return {
        ok: true as const,
        row,
        statId: stat.id,
        uploadSlotIdno: String(stat.slot_idno ?? ""),
        uploadSubSlotIdno: String(stat.sub_slot_idno ?? "").trim() || null,
        displaySlotIdno: toRowSlotIdno(row),
        rowId: `${row.slotIdno}-${row.subSlotIdno ?? ""}`,
      }
    },
    toDisplaySlotIdno: toRowSlotIdno,
    toRowId: (row: ProductionRowModel) => `${row.slotIdno}-${row.subSlotIdno ?? ""}`,
    getRowData: () => rowData.value,
  }

  // ── Shared core (feed flow + unload/replace + material query + back nav) ──

  const materialQuery = usePanasonicMaterialQueryState(productionUuid)

  const {
    submitPostProductionFeed,
    fetchMaterialInventory,
    isUnloadMode,
    enterUnloadMode: _enterUnloadMode,
    exitUnloadMode: _exitUnloadMode,
    toggleUnloadMode: _toggleUnloadMode,
    submitUnload,
    submitForceUnloadBySlot,
    findUniqueUnloadSlotByPackCode,
    validateUnloadMaterialPackCode,
    validateReplacementMaterialForSlot,
    submitReplace,
    submitSplice,
    showMaterialQueryModal,
    onClickBackArrow,
    materialQueryRowData,
    fetchMaterialQueryLogs,
  } = useMounterPostProductionWorkflowCore<ProductionRowModel>({
    rowData,
    gridApi,
    uploader: recordUploader,
    slotStrategy: panasonicSlotStrategy,
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
    isMockMode: () => options.isMockMode === true,
    isProductionStarted: () => productionStarted.value,
    getOperatorIdno: () => currentUsername.value || null,
    resetMaterialScan: options.onResetInputs,
    appendedMaterialUpload,
    inspectionUpload,
    onAfterReplaceGridUpdate: (rowId, api) => {
      api.getRowNode(rowId)?.setDataValue("operatorIdno", currentUsername.value || "")
    },
    materialQuery,
    homePath: PANASONIC_HOME_PATH,
  })

  void _enterUnloadMode
  void _exitUnloadMode
  void _toggleUnloadMode

  const handleSlotSubmit = async ({
    slot,
    subSlot,
    slotIdno,
  }: {
    slot: string
    subSlot: string
    slotIdno: string
  }) => {
    return submitPostProductionFeed({
      slot,
      subSlot,
      slotIdno,
      result: postProductionFeedStore.materialResult,
    })
  }

  // ── Roll shortage ──────────────────────────────────────────────────────────

  const rollTypeOptions = [
    { label: "接料", value: "roll" },
    { label: "新捲料", value: "new" },
  ]

  const rollShortageRules: FormRules = {
    materialInventoryIdno: {
      required: true,
      message: "請輸入單包條碼",
      trigger: ["blur"],
    },
    slotIdno: { required: true, message: "請輸入槽位", trigger: ["blur"] },
    type: {
      required: true,
      message: "請選擇接料類型",
      trigger: ["change"],
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

  // ── Material query ─────────────────────────────────────────────────────────

  const onMaterialQuery = () => {
    if (!productionUuid.value) {
      ui.error("尚未取得生產 UUID")
      return
    }
    showMaterialQueryModal.value = true
  }

  // ── Production start/stop ──────────────────────────────────────────────────

  const { onProduction } = usePanasonicProductionStart({
    route,
    router,
    dialog,
    ui: { success: ui.success, error: ui.error },
    rowData,
    productionStarted,
    isTestingMode,
    machineSide,
    boardSide,
    mounterIdno,
    startPanasonicProduction: deps.startPanasonicProduction,
  })

  const handleProductionStopped = () => {
    productionStarted.value = false
    ui.success(msg.production.stopped)
    router.push(PANASONIC_HOME_PATH)
  }

  // ── Mounted ────────────────────────────────────────────────────────────────

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
        router.push(PANASONIC_NOT_FOUND_PATH)
      }
    }
  })

  return {
    productionUuid,
    isTestingMode,
    mounterIdno,
    currentUsername,
    currentOperatorIdno,
    mounterData,
    rowData,
    productionStarted,
    workOrderIdno,
    productIdno,
    boardSide,
    machineSideLabel,
    isUnloadMode,
    onGridReady,
    onProduction,
    handleProductionStopped,
    handleSlotSubmit,
    submitUnload,
    submitForceUnloadBySlot,
    findUniqueUnloadSlotByPackCode,
    validateUnloadMaterialPackCode,
    validateReplacementMaterialForSlot,
    submitReplace,
    submitSplice,
    fetchMaterialInventory,
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
    materialQueryRowData,
    fetchMaterialQueryLogs,
    ui,
  }
}
