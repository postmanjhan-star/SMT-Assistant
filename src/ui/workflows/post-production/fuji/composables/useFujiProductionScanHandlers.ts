import type { Ref } from "vue"
import type { SmtMaterialInventory } from "@/application/shared/clientTypes"
import type { PostProductionMaterialResult } from "@/stores/postProductionFeedStore"
import { MATERIAL_UNLOAD_TRIGGER } from "@/domain/mounter/operationModes"
import { parseFujiSlotIdno } from "@/domain/slot/FujiSlotParser"
import { resolveMaterialLookupError } from "@/domain/material/MaterialLookupError"
import type { FujiProductionRowModel } from "@/domain/production/buildFujiProductionRowData"
import { MODE_NAME_TESTING } from "@/ui/shared/messageCatalog"

export type FujiScanHandlersDeps = {
  ui: {
    success: (msg: string) => void
    warn: (msg: string) => void
    error: (msg: string) => void
    info: (msg: string) => void
  }
  isTestingMode: Ref<boolean>
  fujiUploader: {
    fetchMaterialInventory: (code: string) => Promise<SmtMaterialInventory>
  }
  materialFormValue: Ref<{ materialInventoryIdno: string }>
  slotFormValue: Ref<{ slotIdno: string }>
  slotInputRef: Ref<{ focus?: () => void } | null>
  materialInventoryFromScan: Ref<SmtMaterialInventory | null>
  getMaterialMatchedRows: (materialIdno: string) => FujiProductionRowModel[]
  resetForms: () => void
  toggleUnloadMode: () => void
  submitPostProductionFeed: (params: {
    slot: string
    subSlot: string
    slotIdno: string
    result: PostProductionMaterialResult
  }) => Promise<unknown>
}

export function useFujiProductionScanHandlers(deps: FujiScanHandlersDeps) {
  const {
    ui, isTestingMode, fujiUploader,
    materialFormValue, slotFormValue, slotInputRef, materialInventoryFromScan,
    getMaterialMatchedRows, resetForms, toggleUnloadMode, submitPostProductionFeed,
  } = deps

  async function onSubmitMaterialInventoryForm() {
    const idno = materialFormValue.value.materialInventoryIdno.trim()
    if (!idno) return ui.warn("請輸入物料條碼")

    if (idno.toUpperCase() === MATERIAL_UNLOAD_TRIGGER) {
      toggleUnloadMode()
      materialFormValue.value.materialInventoryIdno = ""
      return
    }

    try {
      materialInventoryFromScan.value = await fujiUploader.fetchMaterialInventory(idno)
    } catch (error) {
      if (isTestingMode.value && (error as { status?: number })?.status === 404) {
        ui.info(`${MODE_NAME_TESTING}：使用測試物料 ${idno}`)
        materialInventoryFromScan.value = {
          idno,
          material_idno: `TEST-${idno}`,
          material_id: 0,
          material_name: "Testing Material",
        } as unknown as SmtMaterialInventory
      } else {
        ui.error(resolveMaterialLookupError(error))
        resetForms()
        return
      }
    }

    const material = materialInventoryFromScan.value
    if (!material) {
      ui.error("物料查詢失敗")
      resetForms()
      return
    }

    const matchedRows = getMaterialMatchedRows(material.material_idno)
    if (matchedRows.length === 0) {
      if (!isTestingMode.value) {
        ui.error("查無可綁定槽位")
        resetForms()
        return
      }

      ui.info("查無可綁定槽位，請直接掃描槽位進行測試綁定")
    } else {
      ui.success(`物料已匹配：${material.material_idno}`)
    }

    slotInputRef.value?.focus()
  }

  async function onSubmitSlotForm() {
    const inputSlotIdno = slotFormValue.value.slotIdno.trim()
    if (!inputSlotIdno) return ui.warn("請輸入槽位")
    if (!materialInventoryFromScan.value) return ui.error("請先掃描物料條碼")

    const parsed = parseFujiSlotIdno(inputSlotIdno)
    if (!parsed) return ui.error("槽位格式錯誤")

    const { stage, slot } = parsed
    const material = materialInventoryFromScan.value
    const matchedRows = getMaterialMatchedRows(material.material_idno).map((row) => ({
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

  return { onSubmitMaterialInventoryForm, onSubmitSlotForm }
}
