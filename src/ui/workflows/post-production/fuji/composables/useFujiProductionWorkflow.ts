import { computed, onMounted, ref } from "vue"
import { useRoute, useRouter } from "vue-router"
import { type GridApi, type GridReadyEvent } from "ag-grid-community"
import { useDialog, type InputInst } from "naive-ui"
import {
  ApiError,
  CheckMaterialMatchEnum,
  FeedMaterialTypeEnum,
  MaterialOperationTypeEnum,
  ProduceTypeEnum,
  SmtService,
  type UnfeedReasonEnum,
  type BoardSideEnum,
  type FujiItemStatFeedLogRead,
  type FujiMounterItemStatRead,
  type SmtMaterialInventory,
} from "@/client"
import { useUiNotifier } from "@/ui/shared/composables/useUiNotifier"
import { useAuthStore } from "@/stores/authStore"
import {
  appendMaterialCode,
  findLoadedSlotByPack,
  isInspectionScan,
  removeMaterialCode,
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

const MODE_NAME_TESTING = "🧪 試產生產模式"
const MODE_NAME_NORMAL = "✅ 正式生產模式"
const MATERIAL_UNLOAD_TRIGGER = "S5555"
const MATERIAL_UNLOAD_MODE_NAME = "換料卸除"

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
  const authStore = useAuthStore()
  const currentUsername = computed(
    () =>
      authStore.authState.OAuth2PasswordBearer?.username ??
      authStore.authState.HTTPBasic?.value?.username ??
      ""
  )

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
  const materialInputRef = ref<InputInst | null>(null)
  const slotInputRef = ref<InputInst | null>(null)
  const materialInventoryFromScan = ref<SmtMaterialInventory | null>(null)

  const isUnloadMode = ref(false)
  const unloadMaterialValue = ref("")
  const unloadSlotValue = ref("")

  const gridApi = ref<GridApi | null>(null)
  const showMaterialQueryModal = ref(false)

  function parseAppendedCodes(value: string | null | undefined): string[] {
    const raw = String(value ?? "").trim()
    if (!raw) return []

    return raw
      .split(",")
      .map((code) => code.trim())
      .filter((code) => code.length > 0)
  }

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

  function enterUnloadMode() {
    isUnloadMode.value = true
    unloadMaterialValue.value = ""
    unloadSlotValue.value = ""
    resetForms()
  }

  function exitUnloadMode() {
    isUnloadMode.value = false
    unloadMaterialValue.value = ""
    unloadSlotValue.value = ""
    resetForms()
  }

  function toggleUnloadMode() {
    if (isUnloadMode.value) {
      exitUnloadMode()
      return
    }

    enterUnloadMode()
  }

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

  async function submitUnload(params: {
    materialPackCode: string
    slotIdno: string
    unfeedReason?: UnfeedReasonEnum | string | null
  }): Promise<boolean> {
    const materialPackCode = params.materialPackCode.trim()
    const slotIdno = params.slotIdno.trim()

    if (!materialPackCode) {
      showError("請先輸入物料條碼")
      return false
    }

    if (!slotIdno) {
      showError("請輸入槽位")
      return false
    }

    const parsed = parseFujiSlotIdno(slotIdno)
    if (!parsed) {
      showError("槽位格式錯誤")
      return false
    }

    const stat = mounterData.value.find((current) =>
      isFujiStatSlotMatch(current, parsed.slot, parsed.stage)
    )
    if (!stat) {
      showError(`找不到槽位 ${slotIdno}`)
      return false
    }

    const rowId = `${parsed.machineIdno}-${parsed.stage}-${parsed.slot}`
    const row = rowData.value.find(
      (current) =>
        current.mounterIdno === parsed.machineIdno &&
        current.stage === parsed.stage &&
        current.slot === parsed.slot
    )

    if (!row) {
      showError(`找不到槽位 ${slotIdno}`)
      return false
    }

    const inMain = String(row.materialInventoryIdno ?? "").trim() === materialPackCode
    const inAppended = parseAppendedCodes(row.appendedMaterialInventoryIdno).includes(
      materialPackCode
    )
    if (!inMain && !inAppended) {
      showError(`料號 ${materialPackCode} 不在槽位 ${slotIdno} 的主料或接料清單`)
      return false
    }

    try {
      const uploadSlot = resolveUploadSlotByStatId(stat.id, {
        slotIdno: String(parsed.slot),
        subSlotIdno: parsed.stage,
      })

      await SmtService.addFujiMounterItemStatRoll({
        requestBody: {
          stat_item_id: stat.id,
          operator_id: "",
          operation_time: new Date().toISOString(),
          slot_idno: uploadSlot.slotIdno,
          sub_slot_idno: uploadSlot.subSlotIdno ?? null,
          material_pack_code: materialPackCode,
          operation_type: MaterialOperationTypeEnum.UNFEED,
          feed_material_pack_type: null,
          unfeed_material_pack_type: "NORMAL_UNFEED",
          unfeed_reason: params.unfeedReason ?? "MATERIAL_FINISHED",
          check_pack_code_match: null,
        } as any,
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

      showSuccess(`卸料成功：${materialPackCode} @ ${slotIdno}`)
      return true
    } catch (error) {
      showError("上傳卸料資料失敗")
      console.error(error)
      return false
    }
  }

  async function submitForceUnloadBySlot(params: {
    slotIdno: string
    unfeedReason?: UnfeedReasonEnum | string | null
  }): Promise<{
    ok: boolean
    slotIdno?: string
    materialPackCode?: string
  }> {
    const slotIdno = params.slotIdno.trim()
    if (!slotIdno) {
      showError("請輸入槽位")
      return { ok: false }
    }

    const parsed = parseFujiSlotIdno(slotIdno)
    if (!parsed) {
      showError("槽位格式錯誤")
      return { ok: false }
    }

    const row = rowData.value.find(
      (current) =>
        current.mounterIdno === parsed.machineIdno &&
        current.stage === parsed.stage &&
        current.slot === parsed.slot
    )
    if (!row) {
      showError(`找不到槽位 ${slotIdno}`)
      return { ok: false }
    }

    const appendedCodes = parseAppendedCodes(row.appendedMaterialInventoryIdno)
    const preferredPackCode = appendedCodes[appendedCodes.length - 1]
    const mainPackCode = String(row.materialInventoryIdno ?? "").trim()
    const materialPackCode = String(preferredPackCode ?? mainPackCode).trim()
    if (!materialPackCode) {
      showError(`槽位 ${slotIdno} 無可卸除料號`)
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
      slotIdno: `${row.mounterIdno}-${row.stage}-${row.slot}`,
      materialPackCode,
    }
  }

  function findUniqueUnloadSlotByPackCode(materialPackCode: string) {
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
      const slots = matchedRows
        .map((row) => `${row.mounterIdno}-${row.stage}-${row.slot}`)
        .join(", ")
      return {
        ok: false as const,
        error: `料號 ${targetPackCode} 對應多個站位：${slots}`,
      }
    }

    const matched = matchedRows[0]
    return {
      ok: true as const,
      slotIdno: `${matched.mounterIdno}-${matched.stage}-${matched.slot}`,
      rowId: `${matched.mounterIdno}-${matched.stage}-${matched.slot}`,
    }
  }

  async function validateReplacementMaterialForSlot(params: {
    materialPackCode: string
    slotIdno: string
  }): Promise<boolean> {
    const materialPackCode = params.materialPackCode.trim()
    const slotIdno = params.slotIdno.trim()
    if (!materialPackCode) {
      showError("請先輸入物料條碼")
      return false
    }

    const parsed = parseFujiSlotIdno(slotIdno)
    if (!parsed) {
      showError("槽位格式錯誤")
      return false
    }

    const row = rowData.value.find(
      (current) =>
        current.mounterIdno === parsed.machineIdno &&
        current.stage === parsed.stage &&
        current.slot === parsed.slot
    )
    if (!row) {
      showError(`找不到槽位 ${slotIdno}`)
      return false
    }

    try {
      const materialInventory = await SmtService.getMaterialInventoryForSmt({
        materialInventoryIdno: materialPackCode,
      })
      const scannedMaterialId = String(materialInventory.material_idno ?? "").trim()
      const expectedMaterialId = String(row.materialIdno ?? "").trim()
      if (!scannedMaterialId || scannedMaterialId !== expectedMaterialId) {
        showError(`料號不符：站位 ${slotIdno} 應為 ${expectedMaterialId}`)
        return false
      }
      return true
    } catch (error) {
      showError(resolveMaterialLookupError(error))
      return false
    }
  }

  async function submitReplace(params: {
    materialPackCode: string
    slotIdno: string
  }): Promise<boolean> {
    const materialPackCode = params.materialPackCode.trim()
    const slotIdno = params.slotIdno.trim()
    if (!materialPackCode) {
      showError("請先輸入物料條碼")
      return false
    }

    const parsed = parseFujiSlotIdno(slotIdno)
    if (!parsed) {
      showError("槽位格式錯誤")
      return false
    }

    const row = rowData.value.find(
      (current) =>
        current.mounterIdno === parsed.machineIdno &&
        current.stage === parsed.stage &&
        current.slot === parsed.slot
    )
    if (!row) {
      showError(`找不到槽位 ${slotIdno}`)
      return false
    }

    const stat = mounterData.value.find((current) =>
      isFujiStatSlotMatch(current, parsed.slot, parsed.stage)
    )
    if (!stat) {
      showError(`找不到槽位 ${slotIdno}`)
      return false
    }

    try {
      const uploadSlot = resolveUploadSlotByStatId(stat.id, {
        slotIdno: String(parsed.slot),
        subSlotIdno: parsed.stage,
      })

      await appendedMaterialUpload({
        stat_id: stat.id,
        inputSlot: uploadSlot.slotIdno,
        inputSubSlot: uploadSlot.subSlotIdno,
        materialInventory: { idno: materialPackCode } as SmtMaterialInventory,
        correctState: CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK,
      })
    } catch (error) {
      showError("上傳接料資料失敗")
      console.error(error)
      return false
    }

    const rowId = `${parsed.machineIdno}-${parsed.stage}-${parsed.slot}`
    const now = new Date().toISOString()
    const nextAppended = appendMaterialCode(row.appendedMaterialInventoryIdno, materialPackCode)
    row.correct = CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK
    row.appendedMaterialInventoryIdno = nextAppended
    row.operationTime = now
    const nextFirstAppendTime = row.firstAppendTime ?? now
    row.firstAppendTime = nextFirstAppendTime

    try {
      const rowNode = gridApi.value?.getRowNode(rowId)
      rowNode?.setDataValue("correct", CheckMaterialMatchEnum.MATCHED_MATERIAL_PACK)
      rowNode?.setDataValue("operationTime", now)
      rowNode?.setDataValue("appendedMaterialInventoryIdno", nextAppended)
      rowNode?.setDataValue("firstAppendTime", nextFirstAppendTime)
    } catch (error) {
      console.error("Failed to refresh grid row after replace", error)
    }

    showSuccess(`接料成功：${materialPackCode} @ ${slotIdno}`)
    return true
  }

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
          showSuccess("生產已結束")
        } catch (error) {
          showError("結束生產失敗")
          console.error(error)
        }
      },
    })
  }

  function onMaterialQuery() {
    showMaterialQueryModal.value = true
  }

  function onClickBackArrow() {
    router.push("/smt/fuji-mounter/")
  }

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
    MATERIAL_UNLOAD_TRIGGER,
    MATERIAL_UNLOAD_MODE_NAME,
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
    isUnloadMode,
    unloadMaterialValue,
    unloadSlotValue,
    showMaterialQueryModal,
    onGridReady,
    onClickBackArrow,
    onSubmitMaterialInventoryForm,
    onSubmitSlotForm,
    submitUnload,
    submitForceUnloadBySlot,
    findUniqueUnloadSlotByPackCode,
    validateReplacementMaterialForSlot,
    submitReplace,
    enterUnloadMode,
    exitUnloadMode,
    onStopProduction,
    onMaterialQuery,
    showError,
  }
}
