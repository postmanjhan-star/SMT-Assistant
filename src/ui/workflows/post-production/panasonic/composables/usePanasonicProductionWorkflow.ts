import { computed, onMounted, ref } from "vue"
import { useRoute, useRouter } from "vue-router"
import {
  ApiError,
  BoardSideEnum,
  CheckMaterialMatchEnum,
  MachineSideEnum,
  PanasonicMounterItemStatCreate,
  ProduceTypeEnum,
  type UnfeedReasonEnum,
} from "@/client"
import { useDialog, type FormRules } from "naive-ui"
import type { GridApi } from "ag-grid-community"

import { useUiNotifier } from "@/ui/shared/composables/useUiNotifier"
import { usePanasonicProductionState } from "@/ui/workflows/post-production/panasonic/composables/usePanasonicProductionState"
import { usePostProductionFeedFlow } from "@/ui/shared/composables/usePostProductionFeedFlow"
import { useRollShortageForm } from "@/ui/shared/composables/useRollShortageForm"
import { usePostProductionFeedStore } from "@/stores/postProductionFeedStore"
import { useAuthStore } from "@/stores/authStore"
import type { ProductionRowModel } from "@/domain/production/buildPanasonicRowData"
import {
  appendMaterialCode,
  removeMaterialCode,
} from "@/domain/production/PostProductionFeedRules"
import { resolveMaterialLookupError } from "@/domain/material/MaterialLookupError"
import {
  createPostproductionPanasonicDeps,
  type PostproductionPanasonicDeps,
} from "@/application/panasonic/di/createPanasonicWorkflowDeps"
import {
  PANASONIC_HOME_PATH,
  PANASONIC_NOT_FOUND_PATH,
} from "@/ui/shared/composables/panasonic/usePanasonicConstants"

export type PanasonicProductionWorkflowOptions = {
  onResetInputs: () => void
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
  const authStore = useAuthStore()
  const currentUsername = computed(
    () =>
      authStore.authState.OAuth2PasswordBearer?.username ??
      authStore.authState.HTTPBasic?.value?.username ??
      ""
  )

  const normalizeRoute = (val: unknown) => String(val ?? "").trim()

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
      operatorId: currentUsername.value || null,
    })

  const appendedMaterialUpload = (params: {
    stat_id: number
    inputSlot: string
    inputSubSlot: string
    materialInventory?: { idno: string } | null
    correctState?: "true" | "false" | "warning" | null
  }) => {
    const materialPackCode = params.materialInventory?.idno
    if (!materialPackCode) {
      throw new Error("materialInventory is required")
    }

    return recordUploader.uploadAppend({
      statId: params.stat_id,
      slotIdno: params.inputSlot,
      subSlotIdno: params.inputSubSlot,
      materialPackCode,
      correctState: params.correctState ?? null,
      feedMaterialPackType: "new",
      operatorId: currentUsername.value || null,
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
    getOperatorIdno: () => currentUsername.value || null,
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
    return submitPostProductionFeed({
      slot,
      subSlot,
      slotIdno,
      result: postProductionFeedStore.materialResult,
    })
  }

  const parseUnloadSlotInput = (
    rawSlot: string
  ): { slot: string; subSlot: string | null } | null => {
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

  const parseAppendedCodes = (value: string | null | undefined): string[] => {
    const raw = String(value ?? "").trim()
    if (!raw) return []
    return raw
      .split(",")
      .map((code) => code.trim())
      .filter((code) => code.length > 0)
  }

  const getProductionRowByStat = (statId: number) =>
    rowData.value.find((row) => row.id === statId)

  const toRowSlotIdno = (row: ProductionRowModel): string => {
    const slot = String(row.slotIdno ?? "").trim()
    const subSlot = String(row.subSlotIdno ?? "").trim()
    return subSlot ? `${slot}-${subSlot}` : slot
  }

  const getStatBySlotInput = (slotInput: string) => {
    const parsed = parseUnloadSlotInput(slotInput)
    if (!parsed) {
      return {
        ok: false as const,
        error: "槽位格式錯誤",
      }
    }

    const bySlot = mounterData.value.filter(
      (stat) => String(stat.slot_idno ?? "").trim() === parsed.slot
    )

    if (bySlot.length === 0) {
      return {
        ok: false as const,
        error: `找不到槽位 ${slotInput}`,
      }
    }

    if (!parsed.subSlot) {
      if (bySlot.length > 1) {
        return {
          ok: false as const,
          error: `槽位 ${parsed.slot} 有多個子槽位，請輸入完整格式（例如 ${parsed.slot}-L）`,
        }
      }

      return {
        ok: true as const,
        stat: bySlot[0],
      }
    }

    const matched = bySlot.find(
      (stat) => String(stat.sub_slot_idno ?? "").trim() === parsed.subSlot
    )
    if (!matched) {
      return {
        ok: false as const,
        error: `找不到槽位 ${parsed.slot}-${parsed.subSlot}`,
      }
    }

    return {
      ok: true as const,
      stat: matched,
    }
  }

  const submitUnload = async (params: {
    materialPackCode: string
    slotIdno: string
    unfeedReason?: UnfeedReasonEnum | string | null
  }): Promise<boolean> => {
    const materialPackCode = params.materialPackCode.trim()
    const slotIdno = params.slotIdno.trim()

    if (!materialPackCode) {
      ui.error("請先輸入物料條碼")
      return false
    }

    const resolved = getStatBySlotInput(slotIdno)
    if (!resolved.ok) {
      ui.error(resolved.error)
      return false
    }

    const stat = resolved.stat
    const row = getProductionRowByStat(stat.id)
    if (!row) {
      ui.error(`找不到槽位 ${slotIdno}`)
      return false
    }

    const inMain = String(row.materialInventoryIdno ?? "").trim() === materialPackCode
    const inAppended = parseAppendedCodes(row.appendedMaterialInventoryIdno).includes(
      materialPackCode
    )

    if (!inMain && !inAppended) {
      ui.error(`料號 ${materialPackCode} 不在槽位 ${slotIdno} 的主料或接料清單`)
      return false
    }

    try {
      await recordUploader.uploadUnfeed({
        statId: stat.id,
        slotIdno: String(stat.slot_idno ?? ""),
        subSlotIdno: String(stat.sub_slot_idno ?? "").trim() || null,
        materialPackCode,
        unfeedReason: params.unfeedReason ?? "MATERIAL_FINISHED",
        operatorId: currentUsername.value || null,
      })

      const nextAppended = removeMaterialCode(
        row.appendedMaterialInventoryIdno,
        materialPackCode
      )
      row.appendedMaterialInventoryIdno = nextAppended
      row.correct = "UNLOADED_MATERIAL_PACK"
      if (inMain) {
        row.materialInventoryIdno = ""
      }

      const rowId = `${row.slotIdno}-${row.subSlotIdno}`
      try {
        const rowNode = gridApi.value?.getRowNode?.(rowId)
        rowNode?.setDataValue("appendedMaterialInventoryIdno", nextAppended)
        rowNode?.setDataValue(
          "correct",
          "UNLOADED_MATERIAL_PACK"
        )
        if (inMain) {
          rowNode?.setDataValue("materialInventoryIdno", "")
        }
      } catch {
        // Grid may be unmounted in unload mode.
      }

      ui.success(`卸料成功：${materialPackCode} @ ${slotIdno}`)
      return true
    } catch (error) {
      ui.error("卸料上傳失敗")
      console.error(error)
      return false
    }
  }

  const submitForceUnloadBySlot = async (params: {
    slotIdno: string
    unfeedReason?: UnfeedReasonEnum | string | null
  }): Promise<{
    ok: boolean
    slotIdno?: string
    materialPackCode?: string
  }> => {
    const slotIdno = params.slotIdno.trim()
    if (!slotIdno) {
      ui.error("請輸入站位")
      return { ok: false }
    }

    const resolved = getStatBySlotInput(slotIdno)
    if (!resolved.ok) {
      ui.error(resolved.error)
      return { ok: false }
    }

    const row = getProductionRowByStat(resolved.stat.id)
    if (!row) {
      ui.error(`找不到槽位 ${slotIdno}`)
      return { ok: false }
    }

    const appendedCodes = parseAppendedCodes(row.appendedMaterialInventoryIdno)
    const preferredPackCode = appendedCodes[appendedCodes.length - 1]
    const mainPackCode = String(row.materialInventoryIdno ?? "").trim()
    const materialPackCode = String(preferredPackCode ?? mainPackCode).trim()

    if (!materialPackCode) {
      ui.error(`槽位 ${slotIdno} 無可卸除料號`)
      return { ok: false }
    }

    const success = await submitUnload({
      materialPackCode,
      slotIdno,
      unfeedReason: params.unfeedReason ?? "WRONG_MATERIAL",
    })

    if (!success) {
      return { ok: false }
    }

    return {
      ok: true,
      slotIdno: toRowSlotIdno(row),
      materialPackCode,
    }
  }

  const findUniqueUnloadSlotByPackCode = (materialPackCode: string) => {
    const targetPackCode = materialPackCode.trim()
    if (!targetPackCode) {
      return {
        ok: false as const,
        error: "請先輸入物料條碼",
      }
    }

    const matchedRows = rowData.value.filter((row) => {
      const inMain = String(row.materialInventoryIdno ?? "").trim() === targetPackCode
      const inAppended = parseAppendedCodes(row.appendedMaterialInventoryIdno).includes(
        targetPackCode
      )
      return inMain || inAppended
    })

    if (matchedRows.length === 0) {
      return {
        ok: false as const,
        error: `找不到料號 ${targetPackCode} 對應的站位`,
      }
    }

    if (matchedRows.length > 1) {
      const slots = matchedRows.map((row) => toRowSlotIdno(row)).join(", ")
      return {
        ok: false as const,
        error: `料號 ${targetPackCode} 對應多個站位：${slots}`,
      }
    }

    return {
      ok: true as const,
      slotIdno: toRowSlotIdno(matchedRows[0]),
      rowId: `${matchedRows[0].slotIdno}-${matchedRows[0].subSlotIdno ?? ""}`,
    }
  }

  const validateReplacementMaterialForSlot = async (params: {
    materialPackCode: string
    slotIdno: string
  }): Promise<boolean> => {
    const materialPackCode = params.materialPackCode.trim()
    const slotIdno = params.slotIdno.trim()
    if (!materialPackCode) {
      ui.error("請先輸入物料條碼")
      return false
    }

    const resolved = getStatBySlotInput(slotIdno)
    if (!resolved.ok) {
      ui.error(resolved.error)
      return false
    }

    const row = getProductionRowByStat(resolved.stat.id)
    if (!row) {
      ui.error(`找不到槽位 ${slotIdno}`)
      return false
    }

    try {
      const materialInventory = await recordUploader.fetchMaterialInventory(materialPackCode)
      const scannedMaterialId = String(materialInventory.material_idno ?? "").trim()
      const expectedMaterialId = String(row.materialIdno ?? "").trim()
      if (!scannedMaterialId || scannedMaterialId !== expectedMaterialId) {
        ui.error(`料號不符：站位 ${slotIdno} 應為 ${expectedMaterialId}`)
        return false
      }
      return true
    } catch (error) {
      ui.error(resolveMaterialLookupError(error))
      return false
    }
  }

  const submitReplace = async (params: {
    materialPackCode: string
    slotIdno: string
  }): Promise<boolean> => {
    const materialPackCode = params.materialPackCode.trim()
    const slotIdno = params.slotIdno.trim()
    if (!materialPackCode) {
      ui.error("請先輸入物料條碼")
      return false
    }

    const resolved = getStatBySlotInput(slotIdno)
    if (!resolved.ok) {
      ui.error(resolved.error)
      return false
    }

    const stat = resolved.stat
    const row = getProductionRowByStat(stat.id)
    if (!row) {
      ui.error(`找不到槽位 ${slotIdno}`)
      return false
    }

    try {
      await recordUploader.uploadAppend({
        statId: stat.id,
        slotIdno: String(stat.slot_idno ?? ""),
        subSlotIdno: String(stat.sub_slot_idno ?? "").trim() || null,
        materialPackCode,
        correctState: "true",
        feedMaterialPackType: "new",
        operatorId: currentUsername.value || null,
      })

      const nextAppended = appendMaterialCode(row.appendedMaterialInventoryIdno, materialPackCode)
      row.appendedMaterialInventoryIdno = nextAppended
      row.correct = CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK
      row.operatorIdno = currentUsername.value || null
      const nextFirstAppendTime = row.firstAppendTime ?? new Date().toISOString()
      row.firstAppendTime = nextFirstAppendTime

      const rowNode = gridApi.value?.getRowNode?.(`${row.slotIdno}-${row.subSlotIdno ?? ""}`)
      rowNode?.setDataValue("appendedMaterialInventoryIdno", nextAppended)
      rowNode?.setDataValue("correct", CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK)
      rowNode?.setDataValue("firstAppendTime", nextFirstAppendTime)
      rowNode?.setDataValue("operatorIdno", currentUsername.value || "")

      ui.success(`接料成功：${materialPackCode} @ ${slotIdno}`)
      return true
    } catch (error) {
      ui.error("上傳接料資料失敗")
      console.error(error)
      return false
    }
  }

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

  const showMaterialQueryModal = ref(false)

  const onMaterialQuery = () => {
    if (!productionUuid.value) {
      ui.error("尚未取得生產 UUID")
      return
    }
    showMaterialQueryModal.value = true
  }

  const onClickBackArrow = () => {
    router.push(PANASONIC_HOME_PATH)
  }

  const convertProduceMode = (value: boolean | null): ProduceTypeEnum | null =>
    value as unknown as ProduceTypeEnum

  const convertBoardSide = (value: string | null): BoardSideEnum | null =>
    value as unknown as BoardSideEnum

  const onProduction = () => {
    const invalid = rowData.value.filter((row) => {
      if (row.correct === CheckMaterialMatchEnum.UNMATCHED_MATERIAL_PACK) return true
      if (row.correct === "UNLOADED_MATERIAL_PACK") return true
      if (!isTestingMode.value && row.correct == null) return true
      return false
    })

    if (invalid.length > 0) {
      return ui.error("尚有槽位未綁定或錯誤，無法開始生產")
    }

    dialog.warning({
      title: "開始生產確認",
      content: "確定要開始生產嗎？",
      positiveText: "確定",
      negativeText: "取消",
      onPositiveClick: () => startProductionUpload(isTestingMode.value),
      onNegativeClick: () => {},
    })
  }

  const startProductionUpload = async (testing: boolean) => {
    const machineSideValue = normalizeRoute(route.query.machine_side)
    machineSide.value =
      machineSideValue === "1"
        ? MachineSideEnum.FRONT
        : machineSideValue === "2"
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
        check_pack_code_match:
          row.correct === "UNLOADED_MATERIAL_PACK" ? null : row.correct,
      }))

      await deps.startPanasonicProduction(payload)

      ui.success("開始生產，資料已上傳")
      productionStarted.value = true

      router.replace({
        path: route.path,
        query: {
          ...route.query,
        },
      })
    } catch (err) {
      console.error("upload failed: ", err)
      ui.error("上傳失敗")
    }
  }

  const handleProductionStopped = () => {
    productionStarted.value = false
    ui.success("生產已結束")
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
        router.push(PANASONIC_NOT_FOUND_PATH)
      }
    }
  })

  return {
    productionUuid,
    isTestingMode,
    mounterIdno,
    currentUsername,
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
    submitUnload,
    submitForceUnloadBySlot,
    findUniqueUnloadSlotByPackCode,
    validateReplacementMaterialForSlot,
    submitReplace,
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
