import { onMounted, ref } from "vue"
import { useRoute, useRouter } from "vue-router"
import { type GridApi, type GridReadyEvent } from "ag-grid-community"
import { useDialog } from "naive-ui"
import {
  ApiError,
  CheckMaterialMatchEnum,
  FeedMaterialTypeEnum,
  MaterialOperationTypeEnum,
  ProduceTypeEnum,
  SmtService,
  type BoardSideEnum,
  type FujiItemStatFeedLogRead,
  type FujiMounterItemStatRead,
  type SmtMaterialInventory,
} from "@/client"
import { useUiNotifier } from "@/ui/shared/composables/useUiNotifier"
import { useCurrentUsername } from "@/ui/shared/composables/useCurrentUsername"
import { MATERIAL_UNLOAD_TRIGGER } from "@/domain/mounter/operationModes"
import { useFujiMaterialQueryState } from "@/ui/workflows/post-production/fuji/composables/useFujiMaterialQueryState"
import {
  appendMaterialCode,
  findLoadedSlotByPack,
  isInspectionScan,
  type StatLike,
} from "@/domain/production/PostProductionFeedRules"
import { parseFujiSlotIdno } from "@/domain/slot/FujiSlotParser"
import {
  buildFujiInspectionStats,
  buildFujiProductionRowData,
  isFujiStatSlotMatch,
  type FujiProductionRowModel,
} from "@/domain/production/buildFujiProductionRowData"
import { resolveMaterialLookupError } from "@/domain/material/MaterialLookupError"
import { useUnloadReplaceFlow } from "@/ui/shared/composables/useUnloadReplaceFlow"
import { FujiPostProductionRecordApi } from "@/infra/post-production/FujiPostProductionRecordApi"
import { FujiPostProductionRecordUploader } from "@/application/post-production-feed/FujiPostProductionRecordUploader"
import { MODE_NAME_TESTING, MODE_NAME_NORMAL, msg } from "@/ui/shared/messageCatalog"

function normalizeStageLabel(stage: unknown): string {
  if (stage == null) return ""
  const value = String(stage)
  if (value === "1") return "A"
  if (value === "2") return "B"
  if (value === "3") return "C"
  if (value === "4") return "D"
  return value
}

function statMatchesStage(statStage: unknown, inputStage: string | null): boolean {
  if (!inputStage) return false
  const rawStage = String(statStage ?? "")
  const labelStage = normalizeStageLabel(statStage)
  return inputStage === rawStage || inputStage === labelStage
}

function toUploadSubSlotIdno(value: unknown): string | null {
  if (value == null) return null
  const trimmed = String(value).trim()
  return trimmed ? trimmed : null
}

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.status === 422) return `${fallback}：參數錯誤`
    if (error.status === 404) return `${fallback}：找不到資料`
    if (error.status === 500) return `${fallback}：伺服器錯誤`
    if (error.status === 504) return `${fallback}：服務逾時`
  }
  return fallback
}

export function useFujiProductionWorkflow() {
  const route = useRoute()
  const router = useRouter()
  const dialog = useDialog()
  const { success: showSuccess, warn: showWarn, error: showError, info } = useUiNotifier()
  const { currentUsername } = useCurrentUsername()

  const workOrderIdno = ref("")
  const productIdno = ref("")
  const mounterIdno = ref("")
  const boardSide = ref<BoardSideEnum | null>(null)
  const isTestingMode = ref(false)
  const productionUuid = ref("")
  const productionStarted = ref(false)

  const mounterData = ref<FujiMounterItemStatRead[]>([])
  const inspectionStats = ref<StatLike[]>([])
  const rowData = ref<FujiProductionRowModel[]>([])

  const materialFormValue = ref({ materialInventoryIdno: "" })
  const slotFormValue = ref({ slotIdno: "" })
  const materialInputRef = ref<{ focus?: () => void } | null>(null)
  const slotInputRef = ref<{ focus?: () => void } | null>(null)
  const materialInventoryFromScan = ref<SmtMaterialInventory | null>(null)

  const unloadMaterialValue = ref("")
  const unloadSlotValue = ref("")

  const gridApi = ref<GridApi | null>(null)
  const showMaterialQueryModal = ref(false)

  function resolveUploadSlotByStatId(
    statId: number,
    fallback: { slotIdno: string; subSlotIdno: string | null }
  ) {
    const stat = mounterData.value.find((current) => current.id === statId)
    if (!stat) return fallback

    return {
      slotIdno: String(stat.slot_idno ?? fallback.slotIdno),
      subSlotIdno: toUploadSubSlotIdno(stat.sub_slot_idno) ?? fallback.subSlotIdno,
    }
  }

  function onGridReady(params: GridReadyEvent) {
    gridApi.value = params.api
  }

  function getMaterialMatchedRows(materialIdno: string): FujiProductionRowModel[] {
    return rowData.value.filter((row) => row.materialIdno === materialIdno)
  }

  function resetForms() {
    materialFormValue.value.materialInventoryIdno = ""
    slotFormValue.value.slotIdno = ""
    materialInventoryFromScan.value = null
    materialInputRef.value?.focus()
  }

  // ── Fuji slot strategy ─────────────────────────────────────────────────────

  const fujiSlotStrategy = {
    resolveSlot(slotIdno: string) {
      const parsed = parseFujiSlotIdno(slotIdno)
      if (!parsed) return { ok: false as const, error: "槽位格式錯誤" }

      const stat = mounterData.value.find((current) =>
        isFujiStatSlotMatch(current, parsed.slot, parsed.stage)
      )
      if (!stat) return { ok: false as const, error: `找不到槽位 ${slotIdno}` }

      const row = rowData.value.find(
        (current) =>
          current.mounterIdno === parsed.machineIdno &&
          current.stage === parsed.stage &&
          current.slot === parsed.slot
      )
      if (!row) return { ok: false as const, error: `找不到槽位 ${slotIdno}` }

      const uploadSlot = resolveUploadSlotByStatId(stat.id, {
        slotIdno: String(parsed.slot),
        subSlotIdno: parsed.stage,
      })

      return {
        ok: true as const,
        row,
        statId: stat.id,
        uploadSlotIdno: uploadSlot.slotIdno,
        uploadSubSlotIdno: uploadSlot.subSlotIdno,
        displaySlotIdno: `${parsed.machineIdno}-${parsed.stage}-${parsed.slot}`,
        rowId: `${parsed.machineIdno}-${parsed.stage}-${parsed.slot}`,
      }
    },
    toDisplaySlotIdno: (row: FujiProductionRowModel) =>
      `${row.mounterIdno}-${row.stage}-${row.slot}`,
    toRowId: (row: FujiProductionRowModel) =>
      `${row.mounterIdno}-${row.stage}-${row.slot}`,
    getRowData: () => rowData.value,
  }

  // ── Fuji uploader ──────────────────────────────────────────────────────────

  const fujiApi = new FujiPostProductionRecordApi()
  const fujiUploader = new FujiPostProductionRecordUploader(fujiApi)

  // ── Shared unload/replace flow ─────────────────────────────────────────────

  const {
    isUnloadMode,
    enterUnloadMode,
    exitUnloadMode,
    toggleUnloadMode,
    submitUnload,
    submitForceUnloadBySlot,
    findUniqueUnloadSlotByPackCode,
    validateUnloadMaterialPackCode,
    validateReplacementMaterialForSlot,
    submitReplace,
  } = useUnloadReplaceFlow({
    getGridApi: () => gridApi.value as GridApi | null,
    slotStrategy: fujiSlotStrategy,
    uploader: fujiUploader,
    getOperatorId: () => currentUsername.value || null,
    ui: { success: showSuccess, error: showError },
    onEnterUnloadMode: resetForms,
    onAfterReplaceGridUpdate: (rowId, api, now) => {
      api.getRowNode(rowId)?.setDataValue("operationTime", now)
    },
  })

  // ── Local helpers for upload (pre-production inspection/append) ────────────

  function toPackCodeMatch(
    state: CheckMaterialMatchEnum | null
  ): "true" | "false" | "warning" | null {
    if (state == null) return null
    if (state === CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK) return "true"
    if (state === CheckMaterialMatchEnum.UNMATCHED_MATERIAL_PACK) return "false"
    if (state === CheckMaterialMatchEnum.TESTING_MATERIAL_PACK) return "warning"
    return null
  }

  async function appendedMaterialUpload(params: {
    stat_id: number
    inputSlot: string
    inputSubSlot: string | null
    materialInventory: SmtMaterialInventory
    correctState: CheckMaterialMatchEnum
  }) {
    const payload = {
      stat_item_id: params.stat_id,
      operator_id: "",
      operation_time: new Date().toISOString(),
      slot_idno: params.inputSlot,
      sub_slot_idno: params.inputSubSlot ?? null,
      material_pack_code: params.materialInventory.idno,
      operation_type: MaterialOperationTypeEnum.FEED,
      feed_material_pack_type: FeedMaterialTypeEnum.NEW_MATERIAL_PACK,
      check_pack_code_match: toPackCodeMatch(params.correctState),
    }

    await SmtService.addFujiMounterItemStatRoll({ requestBody: payload as any })
  }

  async function inspectionUpload(params: {
    stat_id: number
    inputSlot: string
    inputSubSlot: string | null
    materialInventory: SmtMaterialInventory
  }) {
    const payload = {
      stat_item_id: params.stat_id,
      operator_id: "",
      operation_time: new Date().toISOString(),
      slot_idno: params.inputSlot,
      sub_slot_idno: params.inputSubSlot ?? null,
      material_pack_code: params.materialInventory.idno,
      operation_type: MaterialOperationTypeEnum.FEED,
      feed_material_pack_type: FeedMaterialTypeEnum.INSPECTION_MATERIAL_PACK,
      check_pack_code_match: "true",
    }

    await SmtService.addFujiMounterItemStatRoll({ requestBody: payload as any })
  }

  // ── Inspection update ──────────────────────────────────────────────────────

  function applyInspectionUpdate(
    mounter: string,
    stage: string | null,
    slot: number | null,
    materialIdno: string
  ) {
    const rowId = `${mounter}-${stage}-${slot}`
    const rowNode = gridApi.value?.getRowNode(rowId)
    if (rowNode) {
      const now = new Date().toISOString()
      const nextCount = (rowNode.data.inspectCount ?? 0) + 1
      rowNode.data.inspectMaterialPackCode = materialIdno
      rowNode.data.inspectTime = now
      rowNode.data.inspectCount = nextCount
      rowNode.data.remark = `巡檢 ${nextCount} 次`
      gridApi.value?.applyTransaction({ update: [rowNode.data] })
      return
    }

    const row = rowData.value.find(
      (current) =>
        current.mounterIdno === mounter && current.stage === stage && current.slot === slot
    )
    if (!row) return

    row.inspectMaterialPackCode = materialIdno
    row.inspectTime = new Date().toISOString()
    row.inspectCount = (row.inspectCount ?? 0) + 1
    row.remark = `巡檢 ${row.inspectCount} 次`

    if (gridApi.value) {
      gridApi.value.applyTransaction({ update: [row] })
    }
  }

  // ── Material inventory form ────────────────────────────────────────────────

  async function onSubmitMaterialInventoryForm() {
    const idno = materialFormValue.value.materialInventoryIdno.trim()
    if (!idno) return showWarn("請輸入物料條碼")

    if (idno.toUpperCase() === MATERIAL_UNLOAD_TRIGGER) {
      toggleUnloadMode()
      materialFormValue.value.materialInventoryIdno = ""
      return
    }

    try {
      materialInventoryFromScan.value = await SmtService.getMaterialInventoryForSmt({
        materialInventoryIdno: idno,
      })
    } catch (error) {
      if (isTestingMode.value && error instanceof ApiError && error.status === 404) {
        info(`${MODE_NAME_TESTING}：使用測試物料 ${idno}`)
        materialInventoryFromScan.value = {
          idno,
          material_idno: `TEST-${idno}`,
          material_id: 0,
          material_name: "Testing Material",
        } as unknown as SmtMaterialInventory
      } else {
        showError(resolveMaterialLookupError(error))
        resetForms()
        return
      }
    }

    const material = materialInventoryFromScan.value
    if (!material) {
      showError("物料查詢失敗")
      resetForms()
      return
    }

    const matchedRows = getMaterialMatchedRows(material.material_idno)
    if (matchedRows.length === 0) {
      if (!isTestingMode.value) {
        showError("查無可綁定槽位")
        resetForms()
        return
      }

      info("查無可綁定槽位，請直接掃描槽位進行測試綁定")
    } else {
      showSuccess(`物料已匹配：${material.material_idno}`)
    }

    slotInputRef.value?.focus()
  }

  // ── Slot form ──────────────────────────────────────────────────────────────

  async function onSubmitSlotForm() {
    const inputSlotIdno = slotFormValue.value.slotIdno.trim()
    if (!inputSlotIdno) return showWarn("請輸入槽位")
    if (!materialInventoryFromScan.value) return showError("請先掃描物料條碼")

    const parsed = parseFujiSlotIdno(inputSlotIdno)
    if (!parsed) return showError("槽位格式錯誤")

    const mounter = parsed.machineIdno
    const stage = parsed.stage
    const slot = parsed.slot
    const materialInventory = materialInventoryFromScan.value

    if (!isTestingMode.value && productionStarted.value && materialInventory) {
      const stat = inspectionStats.value.find(
        (current) =>
          String(current.slotIdno) === String(slot) && statMatchesStage(current.subSlotIdno, stage)
      )

      if (stat) {
        const inspection = isInspectionScan({
          productionStarted: productionStarted.value,
          stat,
          importPackType: FeedMaterialTypeEnum.IMPORTED_MATERIAL_PACK,
          inputPackIdno: materialInventory.idno,
        })

        if (inspection) {
          const statItem = mounterData.value.find((current) =>
            isFujiStatSlotMatch(current, slot, stage)
          )
          if (!statItem) {
            showError(`找不到槽位 ${stage}-${slot}`)
            resetForms()
            return
          }

          try {
            const uploadSlot = resolveUploadSlotByStatId(statItem.id, {
              slotIdno: String(slot),
              subSlotIdno: stage,
            })

            await inspectionUpload({
              stat_id: statItem.id,
              inputSlot: uploadSlot.slotIdno,
              inputSubSlot: uploadSlot.subSlotIdno,
              materialInventory,
            })

            applyInspectionUpdate(mounter, stage, slot, materialInventory.idno)
            showSuccess(`巡檢通過：${stage}-${slot}`)
          } catch (error) {
            showError(getApiErrorMessage(error, "巡檢上傳失敗"))
            console.error(error)
          }

          resetForms()
          return
        }
      }

      const loadedSlot = findLoadedSlotByPack({
        stats: inspectionStats.value,
        importPackType: FeedMaterialTypeEnum.IMPORTED_MATERIAL_PACK,
        inputPackIdno: materialInventory.idno,
      })

      if (loadedSlot) {
        const loadedStage = normalizeStageLabel(loadedSlot.subSlotIdno ?? "")
        const isSameSlot =
          String(loadedSlot.slotIdno) === String(slot) && loadedStage === String(stage ?? "")

        if (!isSameSlot) {
          showError(`巡檢失敗：此料號位於 ${loadedStage}-${loadedSlot.slotIdno}，非 ${stage}-${slot}`)
          resetForms()
          return
        }
      }
    }

    const matchedRows = getMaterialMatchedRows(materialInventory.material_idno)
    const targetRow = matchedRows.find(
      (row) => row.mounterIdno === mounter && row.stage === stage && row.slot === slot
    )

    if (targetRow) {
      try {
        const uploadSlot = resolveUploadSlotByStatId(targetRow.id, {
          slotIdno: String(slot),
          subSlotIdno: stage,
        })

        await appendedMaterialUpload({
          stat_id: targetRow.id,
          inputSlot: uploadSlot.slotIdno,
          inputSubSlot: uploadSlot.subSlotIdno,
          materialInventory,
          correctState: CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK,
        })

        const rowNode = gridApi.value?.getRowNode(`${mounter}-${stage}-${slot}`)
        if (rowNode) {
          rowNode.setDataValue("correct", CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK)
          rowNode.setDataValue("operationTime", new Date().toISOString())
          rowNode.setDataValue(
            "appendedMaterialInventoryIdno",
            appendMaterialCode(rowNode.data.appendedMaterialInventoryIdno, materialInventory.idno)
          )
        }

        showSuccess(`${isTestingMode.value ? MODE_NAME_TESTING : MODE_NAME_NORMAL}：物料綁定成功`)
      } catch (error) {
        showError("上傳接料資料失敗")
        console.error(error)
      }
    } else if (isTestingMode.value) {
      const rowNode = gridApi.value?.getRowNode(`${mounter}-${stage}-${slot}`)
      if (rowNode) {
        try {
          const uploadSlot = resolveUploadSlotByStatId(rowNode.data.id, {
            slotIdno: String(slot),
            subSlotIdno: stage,
          })

          await appendedMaterialUpload({
            stat_id: rowNode.data.id,
            inputSlot: uploadSlot.slotIdno,
            inputSubSlot: uploadSlot.subSlotIdno,
            materialInventory,
            correctState: CheckMaterialMatchEnum.TESTING_MATERIAL_PACK,
          })

          rowNode.setDataValue("correct", CheckMaterialMatchEnum.TESTING_MATERIAL_PACK)
          rowNode.setDataValue("remark", "[測試模式綁定]")
          rowNode.setDataValue("operationTime", new Date().toISOString())
          rowNode.setDataValue(
            "appendedMaterialInventoryIdno",
            appendMaterialCode(rowNode.data.appendedMaterialInventoryIdno, materialInventory.idno)
          )
          showSuccess(`${MODE_NAME_TESTING}：槽位 ${stage}-${slot} 已標記為測試料`)
        } catch (error) {
          showError("上傳接料資料失敗")
          console.error(error)
        }
      } else {
        showError(`找不到輸入槽位 ${inputSlotIdno}`)
      }
    } else {
      const rowNode = gridApi.value?.getRowNode(`${mounter}-${stage}-${slot}`)
      if (rowNode) {
        try {
          const uploadSlot = resolveUploadSlotByStatId(rowNode.data.id, {
            slotIdno: String(slot),
            subSlotIdno: stage,
          })

          await appendedMaterialUpload({
            stat_id: rowNode.data.id,
            inputSlot: uploadSlot.slotIdno,
            inputSubSlot: uploadSlot.subSlotIdno,
            materialInventory,
            correctState: CheckMaterialMatchEnum.UNMATCHED_MATERIAL_PACK,
          })

          rowNode.setDataValue("correct", CheckMaterialMatchEnum.UNMATCHED_MATERIAL_PACK)
          rowNode.setDataValue("operationTime", new Date().toISOString())
          rowNode.setDataValue(
            "appendedMaterialInventoryIdno",
            appendMaterialCode(rowNode.data.appendedMaterialInventoryIdno, materialInventory.idno)
          )
        } catch (error) {
          console.error(error)
        }
      }

      showError(`綁定失敗：此槽位應為 ${matchedRows.map((row) => `${row.stage}-${row.slot}`).join(", ")}`)
    }

    resetForms()
  }

  // ── Stop production ────────────────────────────────────────────────────────

  async function onStopProduction() {
    if (!productionUuid.value) return showError("找不到生產ID，無法結束")

    dialog.warning({
      title: "結束生產確認",
      content: "確定要結束生產嗎？",
      positiveText: "確定",
      negativeText: "取消",
      onPositiveClick: async () => {
        try {
          await SmtService.updateFujiItemStatsEndTime({ uuid: productionUuid.value })
          productionStarted.value = false
          showSuccess(msg.production.stopped)
        } catch (error) {
          showError("結束生產失敗")
          console.error(error)
        }
      },
    })
  }

  // ── Material query ─────────────────────────────────────────────────────────

  const { rowData: materialQueryRowData, load: fetchMaterialQueryLogs } = useFujiMaterialQueryState(productionUuid)

  function onMaterialQuery() {
    showMaterialQueryModal.value = true
  }

  function onClickBackArrow() {
    router.push("/smt/fuji-mounter/")
  }

  // ── Mounted ────────────────────────────────────────────────────────────────

  onMounted(async () => {
    try {
      productionUuid.value = String(route.params.productionUuid ?? "").trim()
      mounterData.value = await SmtService.getTheFujiItemStatsOfProduction({
        uuid: productionUuid.value,
      })

      if (mounterData.value.length > 0) {
        const firstRecord = mounterData.value[0]
        workOrderIdno.value = String(firstRecord.work_order_no ?? "")
        productIdno.value = String(firstRecord.product_idno ?? "")
        mounterIdno.value = String(firstRecord.machine_idno ?? "")
        boardSide.value = firstRecord.board_side
        isTestingMode.value = firstRecord.produce_mode === ProduceTypeEnum.TESTING_PRODUCE_MODE
        productionStarted.value = !firstRecord.production_end
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        router.push("/http-status/404")
      } else {
        showError("載入生產資料失敗")
        console.error(error)
      }
    }

    let logs: FujiItemStatFeedLogRead[] = []
    try {
      logs = await SmtService.getTheFujiStatsOfLogsByUuid({ uuid: productionUuid.value })
    } catch (error) {
      console.error("Failed to fetch logs", error)
    }

    inspectionStats.value = buildFujiInspectionStats(logs, mounterData.value)
    rowData.value = buildFujiProductionRowData(mounterData.value, logs)
  })

  return {
    MODE_NAME_TESTING,
    MODE_NAME_NORMAL,
    workOrderIdno,
    productIdno,
    mounterIdno,
    boardSide,
    isTestingMode,
    currentUsername,
    productionUuid,
    productionStarted,
    rowData,
    materialFormValue,
    slotFormValue,
    materialInputRef,
    slotInputRef,
    materialInventoryFromScan,
    getMaterialMatchedRows,
    isUnloadMode,
    unloadMaterialValue,
    unloadSlotValue,
    showMaterialQueryModal,
    materialQueryRowData,
    fetchMaterialQueryLogs,
    onGridReady,
    onClickBackArrow,
    onSubmitMaterialInventoryForm,
    onSubmitSlotForm,
    submitUnload,
    submitForceUnloadBySlot,
    findUniqueUnloadSlotByPackCode,
    validateUnloadMaterialPackCode,
    validateReplacementMaterialForSlot,
    submitReplace,
    enterUnloadMode,
    exitUnloadMode,
    onStopProduction,
    onMaterialQuery,
    showError,
    mounterData,
    inspectionUpload,
    applyInspectionUpdate,
  }
}
