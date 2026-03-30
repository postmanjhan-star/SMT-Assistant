import { onMounted, ref } from "vue"
import { useRoute, useRouter } from "vue-router"
import { type GridApi, type GridReadyEvent } from "ag-grid-community"
import { useDialog } from "naive-ui"
// eslint-disable-next-line no-restricted-imports -- [Phase-1 whitelist] @/client type imports，Phase 3 移除目標
import {
  type BoardSideEnum,
  type FujiMounterItemStatRead,
  type SmtMaterialInventory,
} from "@/client"
import { useUiNotifier } from "@/ui/shared/composables/useUiNotifier"
import { useCurrentUsername } from "@/ui/shared/composables/useCurrentUsername"
import { usePostProductionFeedFlow } from "@/ui/shared/composables/usePostProductionFeedFlow"
import type { MounterStatLike } from "@/application/post-production-feed/PostProductionFeedDeps"
import type { PostProductionCorrectState } from "@/stores/postProductionFeedStore"
import { MATERIAL_UNLOAD_TRIGGER } from "@/domain/mounter/operationModes"
import { useFujiMaterialQueryState } from "@/ui/workflows/post-production/fuji/composables/useFujiMaterialQueryState"
import type { StatLike } from "@/domain/production/PostProductionFeedRules"
import { parseFujiSlotIdno } from "@/domain/slot/FujiSlotParser"
import {
  buildFujiInspectionStats,
  buildFujiProductionRowData,
  isFujiStatSlotMatch,
  type FujiProductionRowModel,
} from "@/domain/production/buildFujiProductionRowData"
import { resolveMaterialLookupError } from "@/domain/material/MaterialLookupError"
import { useUnloadReplaceFlow } from "@/ui/shared/composables/useUnloadReplaceFlow"
import { MODE_NAME_TESTING, MODE_NAME_NORMAL, msg } from "@/ui/shared/messageCatalog"
import {
  createFujiPostproductionDeps,
  type FujiPostproductionDeps,
} from "@/ui/di/fuji/createFujiPostproductionDeps"

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


export function useFujiProductionWorkflow(
  deps: Partial<FujiPostproductionDeps> = {}
) {
  const { createUploader } = createFujiPostproductionDeps(deps)
  const route = useRoute()
  const router = useRouter()
  const dialog = useDialog()
  const { success: showSuccess, warn: showWarn, error: showError, info, notifyError, playErrorTone } = useUiNotifier()
  const { currentUsername, currentOperatorIdno } = useCurrentUsername()

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
        rowId: `${parsed.slot}-${parsed.stage}`,
      }
    },
    toDisplaySlotIdno: (row: FujiProductionRowModel) =>
      `${row.mounterIdno}-${row.stage}-${row.slot}`,
    toRowId: (row: FujiProductionRowModel) =>
      `${row.slotIdno}-${row.subSlotIdno}`,
    getRowData: () => rowData.value,
  }

  // ── Fuji uploader ──────────────────────────────────────────────────────────

  const fujiUploader = createUploader()

  // ── Shared post-production feed flow ───────────────────────────────────────

  function getMounterDataForFeedFlow(): MounterStatLike[] {
    return mounterData.value.map(stat => {
      const normalizedSubSlot = normalizeStageLabel(stat.sub_slot_idno)
      const inspStat = inspectionStats.value.find(
        is =>
          String(is.slotIdno) === String(stat.slot_idno) &&
          statMatchesStage(is.subSlotIdno, normalizedSubSlot)
      )
      return {
        id: stat.id,
        slot_idno: stat.slot_idno,
        sub_slot_idno: normalizedSubSlot,
        feed_records: inspStat?.feedRecords?.map(r => ({
          feed_material_pack_type: r.feedMaterialPackType ?? null,
          material_pack_code: r.materialPackCode ?? null,
        })) ?? [],
      }
    })
  }

  const { submit: submitPostProductionFeed } = usePostProductionFeedFlow<FujiProductionRowModel>({
    gridApi,
    rowData,
    ui: {
      success: showSuccess,
      warn: showWarn,
      error: showError,
      info,
      notifyError,
      playErrorTone,
      resetSlotMaterialFormInputs: resetForms,
    },
    getMounterData: getMounterDataForFeedFlow,
    isTestingMode: () => isTestingMode.value,
    isProductionStarted: () => productionStarted.value,
    resetMaterialScan: resetForms,
    getOperatorIdno: () => currentUsername.value || null,
    inspectionUpload,
    appendedMaterialUpload,
  })

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

  async function appendedMaterialUpload(params: {
    stat_id: number
    inputSlot: string
    inputSubSlot: string
    materialInventory?: { idno: string } | null
    correctState?: PostProductionCorrectState
  }) {
    const material = params.materialInventory
    if (!material) throw new Error("materialInventory is required")

    const now = new Date().toISOString()
    await fujiUploader.uploadAppend({
      statId: params.stat_id,
      slotIdno: params.inputSlot,
      subSlotIdno: params.inputSubSlot ?? null,
      materialPackCode: material.idno,
      correctState: params.correctState ?? null,
      feedMaterialPackType: 'NEW_MATERIAL_PACK',
    })

    // Update correct + operationTime immediately (shared adapter handles appendedMaterialInventoryIdno)
    const rowId = `${params.inputSlot}-${params.inputSubSlot}`
    const rowNode = gridApi.value?.getRowNode(rowId)
    if (rowNode) {
      if (params.correctState === "true") {
        rowNode.setDataValue("correct", 'MATCHED_MATERIAL_PACK')
      } else if (params.correctState === "false") {
        rowNode.setDataValue("correct", 'UNMATCHED_MATERIAL_PACK')
      } else if (params.correctState === "warning") {
        rowNode.setDataValue("correct", 'TESTING_MATERIAL_PACK')
      }
      rowNode.setDataValue("operationTime", now)
    }
  }

  async function inspectionUpload(params: {
    stat_id: number
    inputSlot: string
    inputSubSlot: string
    materialInventory: { idno: string }
  }) {
    await fujiUploader.uploadAppend({
      statId: params.stat_id,
      slotIdno: params.inputSlot,
      subSlotIdno: params.inputSubSlot ?? null,
      materialPackCode: params.materialInventory.idno,
      correctState: 'true',
      feedMaterialPackType: 'INSPECTION_MATERIAL_PACK',
    })
  }

  // ── Inspection update ──────────────────────────────────────────────────────

  function applyInspectionUpdate(
    mounter: string,
    stage: string | null,
    slot: number | null,
    materialIdno: string
  ) {
    const rowId = `${slot}-${stage}`
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
      materialInventoryFromScan.value = await fujiUploader.fetchMaterialInventory(idno)
    } catch (error) {
      if (isTestingMode.value && (error as any)?.status === 404) {
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

    const { stage, slot } = parsed
    const material = materialInventoryFromScan.value
    const matchedRows = getMaterialMatchedRows(material.material_idno).map(row => ({
      slotIdno: String(row.slot),
      subSlotIdno: row.stage,
    }))

    await submitPostProductionFeed({
      slot: String(slot),
      subSlot: stage,
      slotIdno: `${stage}-${slot}`,
      result: {
        success: true,
        materialInventory: material,
        matchedRows,
      },
    })
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
          await fujiUploader.stopProduction(productionUuid.value)
          productionStarted.value = false
          showSuccess(msg.production.stopped)
          router.push("/smt/fuji-mounter")
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
    router.push("/smt/fuji-mounter")
  }

  // ── Mounted ────────────────────────────────────────────────────────────────

  onMounted(async () => {
    try {
      productionUuid.value = String(route.params.productionUuid ?? "").trim()
      mounterData.value = await fujiUploader.fetchProductionStats(productionUuid.value)

      if (mounterData.value.length > 0) {
        const firstRecord = mounterData.value[0]
        workOrderIdno.value = String(firstRecord.work_order_no ?? "")
        productIdno.value = String(firstRecord.product_idno ?? "")
        mounterIdno.value = String(firstRecord.machine_idno ?? "")
        boardSide.value = firstRecord.board_side
        isTestingMode.value = firstRecord.produce_mode === 'TESTING_PRODUCE_MODE'
        productionStarted.value = !firstRecord.production_end
      }
    } catch (error) {
      if ((error as any)?.status === 404) {
        router.push("/http-status/404")
      } else {
        showError("載入生產資料失敗")
        console.error(error)
      }
    }

    let logs: Awaited<ReturnType<typeof fujiUploader.fetchFeedLogs>> = []
    try {
      logs = await fujiUploader.fetchFeedLogs(productionUuid.value)
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
    currentOperatorIdno,
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
    showSuccess,
    mounterData,
    inspectionUpload,
    applyInspectionUpdate,
  }
}
