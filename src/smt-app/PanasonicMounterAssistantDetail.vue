<script setup lang="ts">

import { GetRowIdParams, GridOptions, RowNode } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css"; // Core grid CSS, always needed
import "ag-grid-community/styles/ag-theme-balham.css"; // Optional theme CSS
import { AgGridVue } from "ag-grid-vue3"; // the AG Grid Vue Component
import { InputInst, NForm, NFormItem, NGi, NGrid, NInput, NP, NPageHeader, NSpace, NTag, useMessage, NModal, NRadioGroup, NRadioButton, NButton, FormInst, FormRules, useDialog } from 'naive-ui';
import * as Tone from 'tone';
import { onMounted, ref } from 'vue';
import { useMeta } from 'vue-meta';
import { useRoute, useRouter } from 'vue-router';
import {
  ApiError,
  CheckMaterialMatchEnum,
  PanasonicMounterFileRead,
  PanasonicMounterItemStatCreate,
  PanasonicFeedRecordCreate,
  PanasonicItemStatFeedLogRead,
  ProduceTypeEnum,
  BoardSideEnum,
  MachineSideEnum,
  FeedMaterialTypeEnum,
  SmtMaterialInventory,
  SmtService
} from '../client';
import { CloudCog } from "lucide-vue-next";
import { error } from "console";
import { waitFor } from "@testing-library/vue";
import { constants } from "buffer";
import { match } from "assert";
import { validate } from "@babel/types";
import { stat } from "fs/promises";

const route = useRoute();
const router = useRouter();
const message = useMessage();
useMeta({ title: 'Panasonic Mounter Assistant' });

const boardSide = ref<BoardSideEnum>(null)
const machineSide = ref<MachineSideEnum>(null)

const mounterData = ref<PanasonicMounterFileRead>();
type SmtMaterialInventoryEx = SmtMaterialInventory & { remark?: string }
const slotIdnoInput = ref<InputInst>();
const slotFormValue = ref({
  slotIdno: '',
  materialInventoryIdno: '',
  remark: '',   // ✅ 新增 remark
})
const materialFormValue = ref({ materialInventoryIdno: '' });
const materialInventoryIdnoInput = ref<InputInst>();

type ResultType = {
  success: boolean,
  materialInventory?: SmtMaterialInventoryEx | null,
  matchedRows?: any[]
}

const dialog = useDialog()

const materialInventoryResult = ref<ResultType | null>(null)

type CorrectState = 'true' | 'false' | 'warning'

type RowModel = {
  correct: CorrectState | null,
  id: number,
  slotIdno: string,
  subSlotIdno: string,
  materialIdno: string,
  materialInventoryIdno: string,
  appendedMaterialInventoryIdno: string,
  remark?: string,
}

const rowData = ref<RowModel[]>([]);

const gridOptions: GridOptions = {
  // PROPERTIES
  // Column Definitions
  columnDefs: [
    { field: "correct", tooltipField: 'correct', headerName: '', flex: 1, minWidth: 60, refData: { 'true': '✅', 'false': '❌', 'warning': '⚠️' } },
    { field: "slotIdno", tooltipField: 'slotIdno', headerName: '槽位', flex: 3, minWidth: 90 },
    { field: "subSlotIdno", tooltipField: 'subSlotIdno', headerName: '子槽位', flex: 2, minWidth: 100 },
    { field: "materialIdno", tooltipField: 'materialIdno', headerName: '物料號', flex: 4, minWidth: 140 },
    { field: "materialInventoryIdno", tooltipField: 'materialInventoryIdno', headerName: '單包代碼', flex: 5, minWidth: 140 },
    { field: "appendedMaterialInventoryIdno", tooltipField: 'appendedMaterialInventoryIdno', headerName: '接料代碼', flex: 5, minWidth: 140 },
    { field: "remark", headerName: '備註', flex: 3, minWidth: 120 },
  ],
  defaultColDef: { editable: false, filter: true, sortable: true, resizable: true },

  // Column Moving
  suppressMovableColumns: false,
  suppressColumnMoveAnimation: true,

  // Editing
  stopEditingWhenCellsLoseFocus: true,
  enterNavigatesVerticallyAfterEdit: true,
  undoRedoCellEditing: true,

  // Miscellaneous
  rowBuffer: 100,
  valueCache: true,
  debug: false,

  // Pagination
  pagination: false,

  // Rendering
  enableCellChangeFlash: true,
  suppressColumnVirtualisation: true,
  suppressRowVirtualisation: false,
  domLayout: 'normal',
  getBusinessKeyForNode: (node: RowNode<RowModel>) => { return `${node.data.slotIdno}-${node.data.subSlotIdno}` },

  // RowModel
  rowModelType: 'clientSide',
  getRowId: (params: GetRowIdParams) => { return `${params.data.slotIdno}-${params.data.subSlotIdno}` },

  // Scrolling
  debounceVerticalScrollbar: false,

  // Selection
  enableCellTextSelection: true,
  rowSelection: 'multiple',
  suppressCellFocus: true,

  // Styling
  suppressRowTransform: true,

  // Tooltips
  enableBrowserTooltips: false,

  // // EVENTS
  // // Miscellaneous
  // onViewportChanged: ( event: ViewportChangedEvent ) => { event.columnApi.autoSizeAllColumns() },

  // // RowModel: Client-Side
  // onRowDataUpdated: ( event: RowDataUpdatedEvent ) => { event.columnApi.autoSizeAllColumns() },
}



onMounted(async () => {
  try {
    mounterData.value = await SmtService.getPanasonicMounterMaterialSlotPairs({
      workOrderIdno: route.params.workOrderIdno.toString().trim(),
      mounterIdno: route.params.mounterIdno.toString().trim(),
      productIdno: route.query.product_idno.toString().trim(),
      boardSide: route.query.work_sheet_side.toString() as 'TOP' | 'BOTTOM' | 'DUPLEX',
      machineSide: route.query.machine_side.toString() as '1' | '2', // 1 = front, 2 = back

      // For testing and debugging. Example: http://127.0.0.1/smt/panasonic-mounter/A1-NPM-W2/H0001?work_sheet_side=DUPLEX&machine_side=1&testing_mode=1&testing_product_idno=40X76-002A-T3
      testingMode: route.query.testing_mode === '1' ? true : false,
      testingProductIdno: route.query.testing_product_idno ? route.query.testing_product_idno.toString() : null,
    })
  }
  catch (error) {
    if (error instanceof ApiError && error.status === 404) { router.push('/http-status/404') }
    else if (error instanceof ApiError && error.status === 503) { router.push('/http-status/404') }
  }

  for (let materialSlotPair of mounterData.value.panasonic_mounter_file_items) {
    rowData.value.push({
      correct: null,
      id: materialSlotPair.id,
      slotIdno: materialSlotPair.slot_idno,
      subSlotIdno: materialSlotPair.sub_slot_idno,
      materialIdno: materialSlotPair.smd_model_idno,
      appendedMaterialInventoryIdno: '',
      materialInventoryIdno: '',
    })
  }
})



function onClickBackArrow(event: Event) { router.push(`/smt/panasonic-mounter/`); }


async function playSuccessTone() {
  await Tone.start();
  //create a synth and connect it to the main output (your speakers)
  const synth = new Tone.Synth().toDestination();
  //play a middle 'C' for the duration of an 8th note
  const now = Tone.now()
  synth.triggerAttackRelease("C4", "8n", now)
  synth.triggerAttackRelease("G4", "8n", now + 0.1)
  synth.triggerAttackRelease("F4", "8n", now + 0.2)
}

async function playErrorTone() {
  await Tone.start();
  //create a synth and connect it to the main output (your speakers)
  const synth = new Tone.Synth().toDestination();
  Tone.start();
  const now = Tone.now()
  synth.triggerAttackRelease("D4", "8n", now)
  // synth.triggerAttackRelease("A4", "8n", now + 0.1)
  synth.triggerAttackRelease("D4", "8n", now + 0.2)
}

async function showSuccess(msg: string) {
  await playSuccessTone()
  message.success(msg)
  return true
}

function showWarn(msg: string) {
  message.warning(msg)
  return false
}

async function showError(msg: string) {
  await playErrorTone()
  message.error(msg)
  return false
}


function speak(text: string) {
  text = text.split('').join(', ') // Convert `10010` to `1,0,0,1,0` for speaking characters one by one
  const utterance = new SpeechSynthesisUtterance()
  utterance.text = text
  utterance.lang = 'zh-CN' // zh-CN is much louder and clear
  speechSynthesis.speak(utterance)
}

function resetSlotMaterialFormInputs() {
  slotFormValue.value.slotIdno = ''
  slotFormValue.value.materialInventoryIdno = ''
  slotFormValue.value.remark = ''
  materialFormValue.value.materialInventoryIdno = ''
  materialInventoryIdnoInput.value.focus()
}


function cleanErrorMaterialInventory(currentPackCode: string, inputSlot: string, inputSubSlot: string) {
  if (!currentPackCode) return
  gridOptions.api.forEachNode((node) => {
    const isSame = node.data.materialInventoryIdno === currentPackCode
    const isDifferentSlot = `${node.data.slotIdno}-${node.data.subSlotIdno}` !== `${inputSlot}-${inputSubSlot}`

    if (isSame && isDifferentSlot) {
      node.setDataValue('materialInventoryIdno', '')
      node.setDataValue('correct', '')
      node.setDataValue('remark', '')
    }
  })
}


async function handleMistmatch(result: any, inputSlot: string, inputSubSlot: string, materialRowNode: any) {
  const inputSlotIdno = `${inputSlot}-${inputSubSlot}`
  const newRow = {
    slotIdno: inputSlot,
    subSlotIdno: inputSubSlot,
    correct: 'false' as CorrectState,
    materialInventoryIdno: result.materialInventory?.idno ?? '',
    remark: ''
  }

  const existingNode = gridOptions.api.getRowNode(inputSlotIdno)
  existingNode?.setDataValue('correct', newRow.correct)
  existingNode?.setDataValue('materialInventoryIdno', newRow.materialInventoryIdno)


  // materialRowNode.setDataValue('correct', '')
  materialRowNode.setSelected(false)

  await playErrorTone()
  message.error(`錯誤的槽位 ${inputSlotIdno}`)
  resetSlotMaterialFormInputs()

}

function getMaterialMatchedRowArray(materialIdno: string): RowModel[] {
  return rowData.value.filter(row => row.materialIdno === materialIdno)
}

async function handleMaterialInventoryError(
  error: unknown,
  idno: string,
  isTestingMode: boolean
): Promise<SmtMaterialInventoryEx | null> {

  // ✅ 測試模式找不到 → 用虛擬料 + ⚠️
  if (error instanceof ApiError && error.status === 404 && isTestingMode) {
    const virtualMaterial = {
      id: -1,
      idno: idno,
      material_idno: 'TEST-MATERIAL',
      material_name: 'TEST-MATERIAL',
      remark: '[廠商測試新料]',
    } as SmtMaterialInventory & { remark?: string }   // ✅ 安全轉型

    message.info(`🧪 試產生產模式：使用物料 [廠商測試新料] ${idno}`)
    // ✅ 把備註也塞回表單
    slotFormValue.value.remark = virtualMaterial.remark ?? ''

    message.success('🧪 試產生產模式：條碼接受完成')
    return virtualMaterial
  }

  // ❌ 一般錯誤處理
  if (error instanceof ApiError) {
    const msg = {
      404: '查無此條碼',
      504: 'ERP 連線超時，請確認 ERP 連線',
      502: 'ERP 連線錯誤，請確認 ERP 連線',
      500: '系統錯誤'
    }[error.status] ?? '未知錯誤'

    message.error(msg)
  } else {
    console.error(error)
    message.error('發生未知例外')
  }

  materialFormValue.value.materialInventoryIdno = ''
  return null
}

// check material pack idno exist or not
async function onSubmitMaterialInventoryForm(event: Event) {

  const idno = materialFormValue.value.materialInventoryIdno.trim()
  if (!idno) return showWarn('請輸入物料號') // STERP Material Pack Idno: A3573382, B4831789

  const isTestingMode = route.query.testing_mode === '1'
  let materialInventory: SmtMaterialInventoryEx | null = null


  // Ask material data by WMS material inventory barcode or ST ERP part pack barcode
  try {
    materialInventory = await SmtService.getMaterialInventoryForSmt({ materialInventoryIdno: idno })

    //🧩 此時 materialInventory 一定有值（真實或測試用）

    // 檢查表內是否有對應物料
    const materialMatchedRowArray = getMaterialMatchedRowArray(materialInventory.material_idno)
    if (materialMatchedRowArray.length === 0) {
      await playErrorTone()
      message.warning('表格內無此物料')
      materialFormValue.value.materialInventoryIdno = ''
      return false
    }

    //⚙️ 僅記錄匹配狀態，不刷新畫面
    // for (let row of materialMatchedRowArray) {
    //   row.correct = 'true'   // 只更新資料屬性，不觸發 grid API
    // }

    materialInventoryResult.value = {
      success: true,
      materialInventory,
      matchedRows: materialMatchedRowArray
    }

    await playSuccessTone()
    message.success(isTestingMode ? '🧪 試產生產模式：物料匹配成功' : '✅ 正式生產模式：物料匹配成功')
    slotIdnoInput?.value.focus()
    return true

  } catch (error) {
    const handled = await handleMaterialInventoryError(error, idno, isTestingMode)
    if (!handled) return false
    materialInventory = handled

    materialInventoryResult.value = {
      success: true,
      materialInventory,
      matchedRows: [],
    }

    return true
  }


}

async function handleNormalMode(result: ResultType, inputSlot: string, inputSubSlot: string, inputSlotIdno: string) {
  if (!result) return showWarn('請先掃描物料條碼')

  const matchedRows = result.matchedRows || []
  if (matchedRows.length === 0) return showWarn('此物料未匹配任何槽位')

  for (const row of matchedRows) {
    const rowNode = gridOptions.api.getRowNode(`${row.slotIdno}-${row.subSlotIdno}`)

    if (!rowNode) return await showError(`找不到物料槽位 ${inputSlotIdno}`)


    if (row.slotIdno !== inputSlot || row.subSlotIdno !== inputSubSlot) {
      await handleMistmatch(result, inputSlot, inputSubSlot, rowNode)
      materialInventoryResult.value = null
      return false
    }

    cleanErrorMaterialInventory(result.materialInventory?.idno, inputSlot, inputSubSlot)

    rowNode.setDataValue('remark', result.materialInventory?.idno ?? '')
    rowNode.setDataValue('materialInventoryIdno', result.materialInventory?.remark ?? '')
    rowNode.setDataValue('correct', 'true')
    resetSlotMaterialFormInputs()
    materialInventoryResult.value = null

    return await showSuccess(`✅ 正式生產模式：槽位 ${inputSlotIdno} 綁定成功`)
  }
}

async function handleTestingMode(result: ResultType, inputSlot: string, inputSubSlot: string, inputSlotIdno: string) {
  if (!result) return showWarn('請先掃描物料條碼')

  const matchedRows = result.matchedRows || []
  const rowNode = gridOptions.api.getRowNode(`${inputSlot}-${inputSubSlot}`)

  if (!rowNode) return await showError(`找不到的輸入槽位 ${inputSlotIdno}`)

  if (matchedRows.length !== 0) {
    for (const row of matchedRows) {
      const materialRowNode = gridOptions.api.getRowNode(`${row.slotIdno}-${row.subSlotIdno}`)

      if (!materialRowNode) return await showError(`找不到物料槽位 ${inputSlotIdno}`)

      if (row.slotIdno !== inputSlot || row.subSlotIdno !== inputSubSlot) {
        await handleMistmatch(result, inputSlot, inputSubSlot, materialRowNode)
        materialInventoryResult.value = null
        return false
      }

      cleanErrorMaterialInventory(result.materialInventory?.idno, inputSlot, inputSubSlot)

      rowNode.setDataValue('materialInventoryIdno', result.materialInventory?.idno ?? '')
      rowNode.setDataValue('remark', result.materialInventory?.remark ?? '')
      rowNode.setDataValue('correct', 'true')

      resetSlotMaterialFormInputs()
      materialInventoryResult.value = null

      return await showSuccess(`🧪 試產生產模式：槽位 ${inputSlotIdno} 綁定成功`)
    }
  }

  const testRemark = '[廠商測試新料]'
  rowNode.setDataValue('correct', 'warning')
  rowNode.setDataValue('remark', testRemark)
  rowNode.setDataValue('materialInventoryIdno', result.materialInventory?.idno ?? '')
  materialInventoryResult.value = null

  await showSuccess(`🧪 試產生產模式：槽位 ${inputSlotIdno} 已標記為 ${testRemark}`)
  resetSlotMaterialFormInputs()

  console.log(rowData.value)
  return true
}

function convertMatch(s: CorrectState | null): CheckMaterialMatchEnum | null {
  return s as unknown as CheckMaterialMatchEnum
}

function convertProduceMode(s: boolean | null): ProduceTypeEnum | null {
  return s as unknown as ProduceTypeEnum
}

function convertBoardSide(s: String | null): BoardSideEnum | null {
  return s as unknown as BoardSideEnum
}



async function onSubmitSlotForm(event: Event) {
  const inputSlotIdno = slotFormValue.value.slotIdno.trim()
  if (!inputSlotIdno) return showError('請輸入插槽位置')

  const [inputSlot, inputSubSlot = ''] = inputSlotIdno.split('-')
  let result = materialInventoryResult.value
  const isTestingMode = route.query.testing_mode === '1'

  if (isTestingMode) {
    return await handleTestingMode(result, inputSlot, inputSubSlot, inputSlotIdno)
  } else {
    return await handleNormalMode(result, inputSlot, inputSubSlot, inputSlotIdno)
  }

}


const productionStarted = ref(false)

function makeSlotKey(slot: string, subSlot?: string | null) {
  if (subSlot && subSlot.trim() !== '') {
    return `${slot}-${subSlot.trim()}`
  }
  return slot
}

const statMap = new Map<string, any>()
const productionStatUuid = ref<string>('')

function onProduction() {

  const isTestingMode = route.query.testing_mode === '1'

  const invalid = rowData.value.filter(r => {
    if (r.correct === 'false') return true
    if (!isTestingMode && r.correct == null) return true
    return false
  })
  if (invalid.length > 0) {
    return isTestingMode ?
      showError('尚有槽位不匹配，不能開始生產')
      : showError('尚有槽位未確認或不匹配，不能開始生產')
  }

  dialog.warning({
    title: '開始生產確認',
    content: '確定要開始生產嗎？',
    positiveText: '確定',
    negativeText: '取消',
    onPositiveClick: () => {
      // 真正開始生產的邏輯

      return startProductionUpload(isTestingMode)
    },
    onNegativeClick: () => {
      return
    }
  })
}

async function startProductionUpload(isTestingMode: boolean) {
  // 開始生產
  boardSide.value = convertBoardSide(String(route.query.work_sheet_side.toString().trim()))
  switch (route.query.machine_side.toString().trim()) {
    case '1':
      machineSide.value = MachineSideEnum.FRONT
      break
    case '2':
      machineSide.value = MachineSideEnum.BACK
      break
    default:
      machineSide.value = null
  }

  machineSide.value = route.query.machine_side.toString().trim() === '1' ? MachineSideEnum.FRONT : MachineSideEnum.BACK
  try {
    const payload: Array<PanasonicMounterItemStatCreate> = rowData.value.map(row => ({
      operator_id: null,
      operation_time: new Date().toISOString(),
      production_start: new Date().toISOString(),
      work_order_no: String(route.params.workOrderIdno ?? null),
      product_idno: String(route.query.product_idno),
      machine_idno: String(route.params.mounterIdno.toString().trim()),
      machine_side: machineSide.value,
      board_side: boardSide.value,

      slot_idno: row.slotIdno,
      sub_slot_idno: row.subSlotIdno ?? null,
      material_idno: row.materialIdno ?? null,
      material_pack_code: row.materialInventoryIdno ?? null,
      produce_mode: convertProduceMode(isTestingMode ?? false),

      check_pack_code_match: convertMatch(row.correct)
    }))

    console.log('Upload payload', payload)

    const response = await SmtService.addPanasonicMounterItemStats(
      { requestBody: payload }
    )

    productionStatUuid.value = response[0].uuid

    response.forEach(stat => {
      const key = makeSlotKey(stat.slot_idno, stat.sub_slot_idno)
      statMap.set(key, stat)
    })

    console.log('stat_map', statMap)

    showSuccess('開始生產，資料上傳成功')
    productionStarted.value = true

    router.replace({
      path: route.path,
      query: {
        ...route.query,
        uuid: productionStatUuid.value
      }
    })

    router.push(`/smt/panasonic-mounter-production/${productionStatUuid.value}`)

  } catch (err) {
    console.error('upload failed: ', err)
    showError('資料上傳失敗')
  }
}

async function stopProduction() {
  // 結束生產
  const firstStat = statMap.values().next().value

  dialog.warning({
    title: '結束生產確認',
    content: '確定要結束生產嗎？',
    positiveText: '確定',
    negativeText: '取消',
    onPositiveClick: () => {
      productionStarted.value = false
      uploadEndProductionTime(firstStat.uuid)
      return showSuccess('生產已結束')
    },
    onNegativeClick: () => {
      return
    }
  })
}

async function uploadEndProductionTime(uuid: string) {
  await SmtService.updateTheStatsOfProductionEndTimeRecord({
    uuid: uuid,
    endTime: new Date().toISOString()
  })
}

const rollShortageFormRef = ref<FormInst | null>(null)
const showRollShortageModal = ref(false)
const rollTypeOptions = [{ label: '接料', value: 'roll' }, { label: '新捲料', value: 'new' }]

const rollShortageFormValue = ref({
  materialInventoryIdno: '',
  slotIdno: '',
  type: ''
})

const rollShortageRules: FormRules = {
  materialInventoryIdno: { required: true, message: '請輸入單包條碼', trigger: ['blur'] },
  slotIdno: { required: true, message: '請輸入槽位', trigger: ['blur'] },
  type: {
    required: true, message: '請選擇接料類型', trigger: ['change']
  },
}

function onRollShortage() {
  //單捲不足
  showRollShortageModal.value = true
}

function convertFeedMaterialType(s: string | null): FeedMaterialTypeEnum | null {
  return s as unknown as FeedMaterialTypeEnum
}




async function onSubmitShortage() {
  // 可以先驗證表單
  const idno = rollShortageFormValue.value.materialInventoryIdno.trim()
  if (!idno) return showError('請輸入物料號')

  const inputSlotIdno = rollShortageFormValue.value.slotIdno.trim()
  if (!inputSlotIdno) return showError('請輸入槽位')
  const stat = statMap.get(inputSlotIdno)
  const [inputSlot, inputSubSlot = ''] = inputSlotIdno.split('-')
  if (!stat) return showError('找不到對應的槽位')

  const row = rowData.value.find(
    r => r.slotIdno === inputSlot && (r.subSlotIdno ?? '') === inputSubSlot
  )

  if (!row) {
    return showError(`找不到槽位 ${inputSlotIdno}`)
  }

  const rowId = `${row.slotIdno}-${row.subSlotIdno ?? ''}`

  const materialRowNode = gridOptions.api.getRowNode(rowId)
  if (!materialRowNode) {
    return showError(`找不到AG Grid 資料列 ${rowId}`)
  }
  const packType = rollShortageFormValue.value.type
  if (!packType) return showError('請選擇物料類型')

  let materialInventory: SmtMaterialInventoryEx | null = null

  const isTestingMode = route.query.testing_mode === '1'

  let correctState: CorrectState | null = null

  try {
    rollShortageFormRef.value?.validate()


    materialInventory = await SmtService.getMaterialInventoryForSmt({ materialInventoryIdno: idno })

    const materialMatchRowArray = getMaterialMatchedRowArray(materialInventory.material_idno)

    if (materialMatchRowArray.length === 0) {
      await playErrorTone()
      return showError('表格內無此物料')
    }

    correctState = 'true'

  } catch (error) {

    if (error instanceof ApiError && error.status === 404 && isTestingMode) {
      message.info(`🧪 試產生產模式：使用物料 [廠商測試新料] ${idno}`)
      correctState = 'warning'
    } else {
      if (error instanceof ApiError) {
        const msg = {
          404: '查無此條碼',
          504: 'ERP 連線超時，請確認 ERP 連線',
          502: 'ERP 連線錯誤，請確認 ERP 連線',
          500: '系統錯誤'
        }[error.status] ?? '未知錯誤'

        message.error(msg)
      } else {
        console.error(error)
        message.error('發生未知例外')
      }
      return null
    }
  }

  const payload: PanasonicFeedRecordCreate = {
    stat_item_id: stat.id,
    operator_id: '',
    operation_time: new Date().toISOString(),
    slot_idno: inputSlot,
    sub_slot_idno: inputSubSlot ?? null,
    material_pack_code: idno,
    feed_material_pack_type: convertFeedMaterialType(packType),
    check_pack_code_match: convertMatch(correctState)
  }
  console.log("送出資料", payload)
  const response = await SmtService.addPanasonicMounterItemStatRoll(
    { requestBody: payload }
  )
  showSuccess("新增成功")

  // const row = rowData.value.find(r => r.slotIdno === inputSlot && (r.subSlotIdno ?? '') === inputSubSlot)

  // console.log(row)

  // if (row) {
  //   row.appendedMaterialInventoryIdno = idno
  // }


  const oldAppendedIdno = row.appendedMaterialInventoryIdno?.trim() || ""

  const newAppendedIdno = oldAppendedIdno ? `${oldAppendedIdno}, ${idno}` : idno

  materialRowNode.setDataValue('appendedMaterialInventoryIdno', newAppendedIdno)

  row.appendedMaterialInventoryIdno = newAppendedIdno

  showRollShortageModal.value = false
  rollShortageFormValue.value = { materialInventoryIdno: '', slotIdno: '', type: '' }

}




const materialQueryGripOptions: GridOptions = {
  columnDefs: [
    { field: "correct", tooltipField: "correct", headerName: "", flex: 1, minWidth: 60, refData: { 'MATCHED_MATERIAL_PACK': '✅', 'UNMATCHED_MATERIAL_PACK': '❌', 'TESTING_MATERIAL_PACK': '⚠️', 'UNCHECKED_MATERIAL_PACK': '' } },
    { field: "slotIdno", tooltipField: 'slotIdno', headerName: '槽位', flex: 3, minWidth: 90 },
    { field: "subSlotIdno", tooltipField: 'subSlotIdno', headerName: '子槽位', flex: 2, minWidth: 100 },
    { field: "materialInventoryIdno", tooltipField: 'materialInventoryIdno', headerName: '接料代碼', flex: 5, minWidth: 140 },
    { field: "materialInventoryType", tooltipField: "materialInventoryType", headerName: '物料類型', flex: 5, minWidth: 140, refData: { 'NEW_MATERIAL_PACK': '新接物料', 'REUSED_MATERIAL_PACK': '舊物料', 'IMPORTED_MATERIAL_PACK': '未標註' } },
    { field: "checktime", tooltipField: "checktime", headerName: '接料時間', flex: 5, minWidth: 140 },
    { field: "operatorName", tooltipField: "operatorName", headerName: '操作人員', flex: 5, minWidth: 140 },
    { field: "remark", tooltipField: "remark", headerName: '備註', flex: 5, minWidth: 140 },
  ],
  defaultColDef: { editable: false, filter: true, sortable: true, resizable: true },
  // Column Moving
  suppressMovableColumns: false,
  suppressColumnMoveAnimation: true,

  // Editing
  stopEditingWhenCellsLoseFocus: true,
  enterNavigatesVerticallyAfterEdit: true,
  undoRedoCellEditing: true,

  // Miscellaneous
  rowBuffer: 100,
  valueCache: true,
  debug: false,

  // Pagination
  pagination: false,

  // Rendering
  enableCellChangeFlash: true,
  suppressColumnVirtualisation: true,
  suppressRowVirtualisation: false,
  domLayout: 'normal',
  getBusinessKeyForNode: (node: RowNode<materialQueryRowModel>) => { return `${node.data.slotIdno}-${node.data.subSlotIdno}` },

  // RowModel
  rowModelType: 'clientSide',
  getRowId: (params: GetRowIdParams) => { return `${params.data.slotIdno}-${params.data.subSlotIdno}` },

  // Scrolling
  debounceVerticalScrollbar: false,

  // Selection
  enableCellTextSelection: true,
  rowSelection: 'multiple',
  suppressCellFocus: true,

  // Styling
  suppressRowTransform: true,

  // Tooltips
  enableBrowserTooltips: false
}


const showMaterialQueryModal = ref(false)

type materialQueryRowModel = {
  correct: CheckMaterialMatchEnum,
  slotIdno: string,
  subSlotIdno: string,
  materialInventoryIdno: string,
  materialInventoryType: FeedMaterialTypeEnum,
  checktime: string,
  operatorName: string,
  remark?: string,
}

const materialQueryRowData = ref<materialQueryRowModel[]>([])

const logData = ref<PanasonicItemStatFeedLogRead[]>([])

async function onMaterialQuery() {
  //接料查詢
  materialQueryRowData.value = []

  try {
    logData.value = await SmtService.getTheStatsOfLogsByUuid({ uuid: productionStatUuid.value })
  } catch (e) {
    console.log(e)
    return showError(`找不到接料資訊${productionStatUuid.value}`)
  }

  for (let materialQueryLog of logData.value) {
    materialQueryRowData.value.push({
      correct: materialQueryLog.check_pack_code_match,
      slotIdno: materialQueryLog.slot_idno,
      subSlotIdno: materialQueryLog.sub_slot_idno,
      materialInventoryIdno: materialQueryLog.material_pack_code,
      materialInventoryType: materialQueryLog.feed_material_pack_type,
      operatorName: '',
      checktime: materialQueryLog.created_at,
      remark: materialQueryLog.check_pack_code_match == CheckMaterialMatchEnum.TESTING_MATERIAL_PACK ? '廠商測試料' : ''
    })
  }

  showMaterialQueryModal.value = true

}




// VirtualKeyboard API does not work properly on Honeywell. 
function hideVirtualKeyboard() {
  // navigator.virtualKeyboard.overlaysContent = true
  // navigator.virtualKeyboard.hide()
}
</script>

<template>
  <!-- 單捲不足 Modal -->
  <n-modal v-model:show="showRollShortageModal" preset="dialog" title="單捲不足">
    <n-form :model="rollShortageFormValue" :rules="rollShortageRules" label-placement="top" ref="rollShortageFormRef">
      <n-form-item show-require-mark label="單包條碼" path="materialInventoryIdno">
        <n-input type="text" v-model:value.lazy="rollShortageFormValue.materialInventoryIdno"
          placeholder="請輸入條碼"></n-input>
      </n-form-item>

      <n-form-item show-require-mark label="槽位" path="slotIdno">
        <n-input type="text" v-model:value.lazy="rollShortageFormValue.slotIdno" placeholder="請輸入槽位"></n-input>
      </n-form-item>

      <n-form-item show-require-mark label="接料類型" path="type">
        <n-radio-group v-model:value.lazy="rollShortageFormValue.type">
          <n-radio-button v-for="rollType in rollTypeOptions" :key="rollType.value" :label="rollType.label"
            :value="rollType.value"></n-radio-button>
        </n-radio-group>
      </n-form-item>
    </n-form>

    <template #action>
      <n-space>
        <n-button @click="showRollShortageModal = false">取消</n-button>
        <n-button type="primary" @click="onSubmitShortage">確定</n-button>
      </n-space>
    </template>
  </n-modal>
  <n-modal v-model:show="showMaterialQueryModal" preset="dialog" title="查詢物料"
    :style="{ width: '90vw', maxWidth: '1400px' }">
    <div style="height: 350px; padding: 1rem;">
      <ag-grid-vue class="ag-theme-balham-dark" :rowData="materialQueryRowData" style="height: 100%;"
        :gridOptions="materialQueryGripOptions">
      </ag-grid-vue>
    </div>
    <template #action>
      <n-button type="primary" @click="showMaterialQueryModal = false">確定</n-button>
    </template>
  </n-modal>
  <n-space vertical :wrap-item="false" style="height: calc(100vh - 60px);">

    <n-space vertical size="small"
      style="padding: 0px 1rem 0 1rem; position: sticky; top: 0px; background-color: var(--table-color); z-index: 1;">
      <n-page-header @back=" onClickBackArrow($event)" style="margin-bottom: 1rem;">
        <!-- ✅ 機號 + 模式標籤 -->
        <template #title>
          <div style="display: flex; align-items: center; gap: 8px; white-space: nowrap;">
            <span>{{ route.params.mounterIdno }}</span>
            <n-tag :type="route.query.testing_mode === '1' ? 'warning' : 'success'" size="small" bordered>
              {{ route.query.testing_mode === '1' ? '🧪 試產模式' : '✅ 正式模式' }}
            </n-tag>
          </div>
        </template>
        <template #default>
          <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
            <!-- 左側：工單資訊 -->
            <n-space size="small">
              <n-p>
                工單：<n-tag type="info" size="small">{{ route.params.workOrderIdno }}</n-tag>
              </n-p>
              <n-p>
                成品料號：<n-tag type="info" size="small">{{ route.query.product_idno }}</n-tag>
              </n-p>
              <n-p>
                工件面向：<n-tag type="info" size="small">{{ route.query.work_sheet_side }}</n-tag>
              </n-p>
              <n-p>
                機台面向：<n-tag type="info" size="small">{{ route.query.machine_side }}</n-tag>
              </n-p>
            </n-space>

            <!-- 右側：功能按鈕 -->
            <n-space size="small">
              <n-button v-if="!productionStarted" type="success" size="small" @click="onProduction">
                🚀 開始生產
              </n-button>
              <n-button v-else type="error" size="small" @click="stopProduction">
                🛑 結束生產
              </n-button>
              <n-button type="warning" size="small" @click="onRollShortage" :disabled="!productionStarted">
                ⚠️ 單捲不足
              </n-button>
              <n-button type="info" size="small" @click="onMaterialQuery" :disabled="!productionStarted">
                🔍 接料查詢
              </n-button>
            </n-space>
          </div>
        </template>
      </n-page-header>

      <n-grid cols="2 s:2" responsive="screen" x-gap="20">
        <n-gi>
          <n-form size="small" :model="materialFormValue" @submit.prevent=" onSubmitMaterialInventoryForm($event)">
            <n-form-item label="物料單包條碼">
              <n-input type="text" size="large" v-model:value.lazy="materialFormValue.materialInventoryIdno" autofocus
                ref="materialInventoryIdnoInput" @focus=" hideVirtualKeyboard()"
                :input-props="{ id: 'materialInventoryIdnoInput' }" :disabled="productionStarted" />
            </n-form-item>
          </n-form>
        </n-gi>

        <n-gi>
          <n-form size="small" :model="slotFormValue" @submit.prevent=" onSubmitSlotForm($event)">
            <n-form-item label="打件機料件槽位">
              <n-input type="text" size="large" v-model:value.lazy="slotFormValue.slotIdno" ref="slotIdnoInput"
                :input-props="{ id: 'slotIdnoInput' }" :disabled="productionStarted" />
            </n-form-item>
          </n-form>
        </n-gi>
      </n-grid>
    </n-space>

    <div style="height: 2000px; padding: 1rem;">
      <ag-grid-vue class="ag-theme-balham-dark" :rowData="rowData" style="height: 100%;" :gridOptions="gridOptions">
      </ag-grid-vue>
    </div>

  </n-space>


</template>



<style>
body {
  /* This does not work. */
  margin-block-end: env(keyboard-inset-height, 5000px);
}
</style>
