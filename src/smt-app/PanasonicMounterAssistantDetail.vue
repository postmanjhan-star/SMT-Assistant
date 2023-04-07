<script setup lang="ts">
import { GetRowIdParams, GridOptions, RowNode } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css"; // Core grid CSS, always needed
import "ag-grid-community/styles/ag-theme-balham.css"; // Optional theme CSS
import { AgGridVue } from "ag-grid-vue3"; // the AG Grid Vue Component
import { InputInst, NForm, NFormItem, NGi, NGrid, NInput, NP, NPageHeader, NSpace, NTag, useMessage } from 'naive-ui';
import * as Tone from 'tone';
import { onMounted, ref } from 'vue';
import { useMeta } from 'vue-meta';
import { useRoute, useRouter } from 'vue-router';
import { ApiError, PanasonicMounterFileRead, SmtMaterialInventory, SmtService } from '../client';

const route = useRoute();
const router = useRouter();
const message = useMessage();
useMeta( { title: 'Panasonic Mounter Assistant' } );

const mounterData = ref<PanasonicMounterFileRead>();

const slotFormValue = ref( { slotIdno: '' } );
const slotIdnoInput = ref<InputInst>();

const materialFormValue = ref( { materialInventoryIdno: '' } );
const materialInventoryIdnoInput = ref<InputInst>();

type RowModel = {
  correct: boolean | null,
  id: number,
  slotIdno: string,
  subSlotIdno: string,
  materialIdno: string,
  materialInventoryIdno: string,
}
const rowData = ref<RowModel[]>( [] );

let materialMatchedRowArray: RowModel[]


const gridOptions: GridOptions = {
  // PROPERTIES
  // Column Definitions
  columnDefs: [
    { field: "correct", tooltipField: 'correct', headerName: '', flex: 1, minWidth: 60, refData: { true: '✅', false: '❌' } },
    { field: "slotIdno", tooltipField: 'slotIdno', headerName: '槽位', flex: 3, minWidth: 90 },
    { field: "subSlotIdno", tooltipField: 'subSlotIdno', headerName: '子槽位', flex: 2, minWidth: 100 },
    { field: "materialIdno", tooltipField: 'materialIdno', headerName: '物料號', flex: 4, minWidth: 140 },
    { field: "materialInventoryIdno", tooltipField: 'materialInventoryIdno', headerName: '單包代碼', flex: 5, minWidth: 140 },
  ],
  defaultColDef: { editable: false, filter: true, sortable: true, resizable: true },

  // Column Moving
  suppressMovableColumns: false,
  suppressColumnMoveAnimation: true,

  // Editing
  stopEditingWhenCellsLoseFocus: true,
  enterMovesDownAfterEdit: true,
  undoRedoCellEditing: true,

  // Miscellaneous
  rowBuffer: 100,
  valueCache: true,
  debug: false,
  suppressParentsInRowNodes: true,

  // Pagination
  pagination: false,

  // Rendering
  enableCellChangeFlash: true,
  suppressColumnVirtualisation: true,
  suppressRowVirtualisation: false,
  domLayout: 'normal',
  getBusinessKeyForNode: ( node: RowNode<RowModel> ) => { return `${ node.data.slotIdno }-${ node.data.subSlotIdno }` },

  // RowModel
  rowModelType: 'clientSide',
  getRowId: ( params: GetRowIdParams ) => { return `${ params.data.slotIdno }-${ params.data.subSlotIdno }` },

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



onMounted( async () => {
  try {
    mounterData.value = await SmtService.getPanasonicMounterMaterialSlotPairs( {
      workOrderIdno: route.params.workOrderIdno.toString().trim(),
      mounterIdno: route.params.mounterIdno.toString().trim(),
      productIdno: route.query.product_idno.toString().trim(),
      boardSide: route.query.work_sheet_side.toString() as 'TOP' | 'BOTTOM' | 'DUPLEX',
      machineSide: route.query.machine_side.toString() as '1' | '2', // 1 = front, 2 = back

      // For testing and debugging. Example: http://127.0.0.1/smt/panasonic-mounter/A1-NPM-W2/H0001?work_sheet_side=DUPLEX&machine_side=1&testing_mode=1&testing_product_idno=40X76-002A-T3
      testingMode: route.query.testing_mode === '1' ? true : false,
      testingProductIdno: route.query.testing_product_idno ? route.query.testing_product_idno.toString() : null,
    } )
  }
  catch ( error ) {
    if ( error instanceof ApiError && error.status === 404 ) { router.push( '/http-status/404' ) }
    else if ( error instanceof ApiError && error.status === 503 ) { router.push( '/http-status/404' ) }
  }

  for ( let materialSlotPair of mounterData.value.panasonic_mounter_file_items ) {
    rowData.value.push( {
      correct: null,
      id: materialSlotPair.id,
      slotIdno: materialSlotPair.slot_idno,
      subSlotIdno: materialSlotPair.sub_slot_idno,
      materialIdno: materialSlotPair.smd_model_idno,
      materialInventoryIdno: '',
    } )
  }
} )



function onClickBackArrow ( event: Event ) { router.push( `/smt/panasonic-mounter/` ); }


async function playSuccseTone () {
  await Tone.start();
  //create a synth and connect it to the main output (your speakers)
  const synth = new Tone.Synth().toDestination();
  //play a middle 'C' for the duration of an 8th note
  const now = Tone.now()
  synth.triggerAttackRelease( "C4", "8n", now )
  synth.triggerAttackRelease( "G4", "8n", now + 0.1 )
  synth.triggerAttackRelease( "F4", "8n", now + 0.2 )
}



async function playErrorTone () {
  await Tone.start();
  //create a synth and connect it to the main output (your speakers)
  const synth = new Tone.Synth().toDestination();
  Tone.start();
  const now = Tone.now()
  synth.triggerAttackRelease( "D4", "8n", now )
  // synth.triggerAttackRelease("A4", "8n", now + 0.1)
  synth.triggerAttackRelease( "D4", "8n", now + 0.2 )
}



function speak ( text: string ) {
  text = text.split( '' ).join( ', ' ) // Convert `10010` to `1,0,0,1,0` for speaking characters one by one
  const utterance = new SpeechSynthesisUtterance()
  utterance.text = text
  utterance.lang = 'zh-CN' // zh-CN is much louder and clear
  speechSynthesis.speak( utterance )
}



function getMaterialMatchedRowArray ( materialIdno: string ): RowModel[] {
  const matchedRow: RowModel[] = []
  for ( let row of rowData.value ) { if ( materialIdno === row.materialIdno ) { matchedRow.push( row ) } }
  if ( matchedRow.length > 0 ) { return matchedRow }
  else { throw Error }
}



async function onSubmitMaterialInventoryForm ( event: Event ) {
  if ( !!materialFormValue.value.materialInventoryIdno.trim() === false ) { // A3573382
    message.warning( '請輸入物料號' )
    return false
  }

  let materialInventory: SmtMaterialInventory

  // Ask material data by WMS material inventory barcode or ST ERP part pack barcode
  try {
    materialInventory = await SmtService.getMaterialInventoryForSmt( { materialInventoryIdno: materialFormValue.value.materialInventoryIdno.trim() } )
  } catch ( error ) {
    await playErrorTone()
    if ( error instanceof ApiError && error.status === 404 ) { message.warning( '查無此條碼' ) }
    else if ( error instanceof ApiError && error.status === 504 ) { message.error( 'ERP 連線超時，請確認 ERP 連線。' ) }
    else if ( error instanceof ApiError && error.status === 502 ) { message.error( 'ERP 連線錯誤，請確認 ERP 連線。' ) }
    else if ( error instanceof ApiError && error.status === 500 ) { message.error( '條碼查詢失敗' ) }
    else { message.error( '錯誤' ) }
    materialFormValue.value.materialInventoryIdno = ''
    return false
  }

  try { materialMatchedRowArray = getMaterialMatchedRowArray( materialInventory.material_idno ) }
  catch ( error ) {
    await playErrorTone()
    message.warning( '表格內無此物料' )
    materialFormValue.value.materialInventoryIdno = ''
    return false
  }

  for ( let row of materialMatchedRowArray ) {
    const rowNode = gridOptions.api.getRowNode( `${ row.slotIdno }-${ row.subSlotIdno }` )
    rowNode.setSelected( true )
    gridOptions.api.ensureIndexVisible( rowNode.rowIndex, 'middle' )
  }
  // speak( rowNode.data.slotIdno ) // Do not give a user voice hint here.
  // speak( rowNode.data.subSlotIdno ) // Do not give a user voice hint here.

  slotIdnoInput.value.focus()
}



async function onSubmitSlotForm ( event: Event ) {
  let inputSlotIdno = slotFormValue.value.slotIdno.trim() // Format: 10010-L for dual-type feeder, 10010 for single-type feeder.
  if ( !!inputSlotIdno === false ) {
    message.warning( '請輸入插槽位置' )
    return false
  }

  const [ inputSlotSlot, inputSlotSubSlot = '' ] = inputSlotIdno.split( '-' )

  for ( let row of materialMatchedRowArray ) {
    const rowNode = gridOptions.api.getRowNode( `${ row.slotIdno }-${ row.subSlotIdno }` )

    // In case of slot idnos not match.
    if ( inputSlotSlot != row.slotIdno || inputSlotSubSlot != row.subSlotIdno ) {
      row.correct = false
      row.materialInventoryIdno = ''

      rowNode.setData( row )
      rowNode.setSelected( false )
      await playErrorTone()
      message.error( '錯誤' )

      slotFormValue.value.slotIdno = ''
      materialFormValue.value.materialInventoryIdno = ''
      materialInventoryIdnoInput.value.focus()
      return false
    }

    // In case of slot idnos match.
    row.correct = true
    row.materialInventoryIdno = materialFormValue.value.materialInventoryIdno.trim()

    rowNode.setData( row )
    rowNode.setSelected( false )
    await playSuccseTone()

    slotFormValue.value.slotIdno = ''
    materialFormValue.value.materialInventoryIdno = ''
    materialInventoryIdnoInput.value.focus()
    return true
  }
}


// VirtualKeyboard API does not work properly on Honeywell. 
function hideVirtualKeyboard () {
  // navigator.virtualKeyboard.overlaysContent = true
  // navigator.virtualKeyboard.hide()
}
</script>



<template>
  <n-space vertical :wrap-item=" false " style="height: calc(100vh - 60px);">

    <n-space vertical size="small"
      style="padding: 0px 1rem 0 1rem; position: sticky; top: 0px; background-color: var(--table-color); z-index: 1;">
      <n-page-header @back=" onClickBackArrow( $event ) " style="margin-bottom: 1rem;">
        <template #title><span style="white-space: nowrap">{{ route.params.mounterIdno }}</span></template>
        <template #default>
          <n-space size="small">
            <n-p>工單：<n-tag type="info" size="small">{{ route.params.workOrderIdno }}</n-tag>
            </n-p>
            <n-p>成品料號：<n-tag type="info" size="small">{{ route.query.product_idno }}</n-tag>
            </n-p>
            <n-p>工件面向：<n-tag type="info" size="small">{{ route.query.work_sheet_side }}</n-tag>
            </n-p>
            <n-p>機台面向：<n-tag type="info" size="small">{{ route.query.machine_side }}</n-tag>
            </n-p>
          </n-space>
        </template>
      </n-page-header>

      <n-grid cols="2 s:2" responsive="screen" x-gap="20">
        <n-gi>
          <n-form size="small" :model=" materialFormValue " @submit.prevent=" onSubmitMaterialInventoryForm( $event ) ">
            <n-form-item label="物料單包條碼">
              <n-input type="text" size="large" v-model:value.lazy=" materialFormValue.materialInventoryIdno " autofocus
                ref="materialInventoryIdnoInput" @focus=" hideVirtualKeyboard() "
                :input-props=" { id: 'materialInventoryIdnoInput' } " />
            </n-form-item>
          </n-form>
        </n-gi>

        <n-gi>
          <n-form size="small" :model=" slotFormValue " @submit.prevent=" onSubmitSlotForm( $event ) ">
            <n-form-item label="打件機料件槽位">
              <n-input type="text" size="large" v-model:value.lazy=" slotFormValue.slotIdno " ref="slotIdnoInput"
                :input-props=" { id: 'slotIdnoInput' } " />
            </n-form-item>
          </n-form>
        </n-gi>
      </n-grid>
    </n-space>

    <div style="height: 2000px; padding: 1rem;">
      <ag-grid-vue class="ag-theme-balham-dark" :rowData=" rowData " style="height: 100%;" :gridOptions=" gridOptions ">
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
