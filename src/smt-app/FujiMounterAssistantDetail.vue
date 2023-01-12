<script setup lang="ts">
/// <reference types="node" />
import { InputInst, NForm, NFormItem, NGi, NGrid, NInput, NPageHeader, NSpace, useMessage } from 'naive-ui'
import { TabulatorFull as Tabulator } from 'tabulator-tables' //import Tabulator library
import "tabulator-tables/dist/css/tabulator_midnight.min.css"
import * as Tone from 'tone'
import { onMounted, ref } from 'vue'
import { useMeta } from 'vue-meta'
import { useRoute, useRouter } from 'vue-router'
import { ApiError, FujiMounterFileRead, SmtMaterialInventory, SmtService } from '../client'

// Slot 太多，只顯示有必要的 slot，其餘不顯示，如果空 slot 被輸入，跳出錯誤訊息。

const route = useRoute();
const router = useRouter();
const message = useMessage();
useMeta( { title: 'Fuji Mounter Assistant' } );

const fstDataArray = ref<FujiMounterFileRead[]>();

const slotFormValue = ref( { slotIdno: '' } );
const slotIdnoInput = ref<InputInst>();

const materialFormValue = ref( { materialInventoryIdno: '' } );
const materialInventoryIdnoInput = ref<InputInst>();

type fstEntry = {
  id: number,
  mounterIdno: string,
  boardSide: string,
  slotSide: string,
  slotNumber: number,
  slotIdno: string,
  materialIdno: string,
  materialInventoryIdno: string,
  correct: boolean | null,
}
const fstDataTable = ref<fstEntry[]>( [] )
let matereialIdnoFromInput: string

const tabulator = ref<Tabulator | null>( null ) //variable to hold your table
const table = ref<HTMLDivElement | null>( null ) //reference to your table element

onMounted( async () => {
  try {
    fstDataArray.value = await SmtService.getFujiMounterMaterialSlotPairs( {
      workOrderIdno: route.params.workOrderIdno.toString().trim(),
      mounterIdno: route.params.mounterIdno.toString().trim(),
      productIdno: route.query.product_idno.toString().trim(),
    } )
  }
  catch ( error ) { if ( error instanceof ApiError && error.status === 404 ) { router.push( '/http-status/404' ) } }

  for ( let masterData of fstDataArray.value ) {
    for ( let detailData of masterData.fuji_mounter_file_items ) {
      fstDataTable.value.push( {
        id: detailData.id,
        mounterIdno: masterData.mounter_idno,
        boardSide: masterData.board_side,
        slotSide: detailData.stage,
        slotNumber: detailData.slot,
        slotIdno: `${ masterData.mounter_idno }-${ detailData.stage }-${ detailData.slot }`,
        materialIdno: detailData.part_number,
        materialInventoryIdno: '',
        correct: null,
      } )
    }
  }
  // console.debug( fstDataTable.value )

  //instantiate Tabulator when element is mounted
  tabulator.value = new Tabulator( table.value, {
    height: '100%', // set height of table (in CSS or here), this enables the Virtual DOM and improves render speed dramatically (can be any valid css height value)
    data: fstDataTable.value, //link data to table
    layout: "fitColumns", //fit columns to width of table (optional)
    layoutColumnsOnNewData: true,
    reactiveData: true, //enable data reactivity
    locale: true, //auto detect the current language.
    columnDefaults: {title: '', headerSort: false, resizable: false },
    columns: [ //define table columns
      { title: "", field: "correct", hozAlign: "center", headerHozAlign: 'center', formatter: "tickCross", formatterParams: { crossElement: null } },
      { title: "機台", field: "mounterIdno", hozAlign: "center", headerHozAlign: 'center' },
      { title: "PCB 板打件面", field: "boardSide", hozAlign: "center", headerHozAlign: 'center' },
      { title: "機台面向", field: "slotSide", hozAlign: "center", headerHozAlign: 'center' },
      { title: "槽位", field: "slotNumber" },
      { title: "物料號", field: "materialIdno" },
      { title: "單包條碼", field: "materialInventoryIdno" },
    ],
  } )
} )


function onClickBackArrow ( event: Event ) { router.push( `/smt/fuji-mounter/` ) }


function parseSlotIdno ( slotIdno: string ) {
  // Slot barcode format: mounterId-slotSide-slotNumber
  const slotIdnoArray = slotIdno.split( '-' )
  let machineIdno = slotIdnoArray[ 0 ];
  let slotSideDigit = slotIdnoArray[ 1 ];
  let slotSide: string;
  switch ( slotSideDigit ) {
    case '1':
      slotSide = 'A';
      break
    case '2':
      slotSide = 'B';
      break;
  }
  let slotNumber = Number( slotIdnoArray[ 2 ] );
  return [ machineIdno, slotSide, slotNumber ]
}


async function playSuccseTone () {
  await Tone.start()
  //create a synth and connect it to the main output (your speakers)
  const synth = new Tone.Synth().toDestination()
  //play a middle 'C' for the duration of an 8th note
  const now = Tone.now()
  synth.triggerAttackRelease( "C4", "8n", now )
  synth.triggerAttackRelease( "G4", "8n", now + 0.1 )
  synth.triggerAttackRelease( "F4", "8n", now + 0.2 )
}


async function playErrorTone () {
  await Tone.start()
  //create a synth and connect it to the main output (your speakers)
  const synth = new Tone.Synth().toDestination()
  Tone.start()
  const now = Tone.now()
  synth.triggerAttackRelease( "D4", "8n", now )
  // synth.triggerAttackRelease("A4", "8n", now + 0.1)
  synth.triggerAttackRelease( "D4", "8n", now + 0.2 )
}


function getMaterialMatchedRow ( materialIdno: string ) {
  for ( let row of fstDataTable.value ) {
    if ( materialIdno == row.materialIdno ) { return row }
  }
}


async function onSubmitMaterialInventoryForm ( event: Event ) {
  if ( !!materialFormValue.value.materialInventoryIdno.trim() === false ) {
    message.warning( '請輸入物料號' )
    return false;
  }

  // Ask material data by WMS material inventory barcode or ST ERP part pack barcode
  let materialInventory: SmtMaterialInventory
  try {
    materialInventory = await SmtService.getMaterialInventoryForSmt( { materialInventoryIdno: materialFormValue.value.materialInventoryIdno.trim() } )
    matereialIdnoFromInput = materialInventory.material_idno
    // matereialIdnoFromInput = '90400-0002-S0' // For testing
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

  const materialMatchedRow = getMaterialMatchedRow( matereialIdnoFromInput )
  // // 不要提示用戶槽位，多此一舉。
  // const utterance = new SpeechSynthesisUtterance( `${ materialMatchedRow.slotSide } ${ materialMatchedRow.slotNumber }` )
  // utterance.lang = 'zh-CN' // zh-TW 會把「B1」唸成「地下一樓」…
  // speechSynthesis.speak( utterance )
  tabulator.value.selectRow( [materialMatchedRow.id] )
  tabulator.value.scrollToRow( materialMatchedRow.id )
  slotIdnoInput.value.focus()
}



async function onSubmitSlotForm ( event: Event ) {
  let inputSlotIdno = slotFormValue.value.slotIdno.trim()
  if ( !!inputSlotIdno === false ) {
    message.warning( '請輸入插槽位置' )
    return false
  }

  // Parse and convert inputSlotIdno XP1B1-1-30 to XP1B1-A-30
  //                             ^             ^
  const [ inputMachineIdno, inputSlotSide, inputSlotNumber ] = parseSlotIdno( inputSlotIdno )
  inputSlotIdno = `${ inputMachineIdno }-${ inputSlotSide }-${ inputSlotNumber }`

  const materialMatchedRow = getMaterialMatchedRow( matereialIdnoFromInput )

  // In case of slot idnos not match.
  if ( inputSlotIdno != materialMatchedRow.slotIdno ) {
    materialMatchedRow.correct = false
    tabulator.value.deselectRow( materialMatchedRow.id )
    await playErrorTone()
    message.error( '錯誤' )
    slotFormValue.value.slotIdno = ''
    materialFormValue.value.materialInventoryIdno = ''
    materialInventoryIdnoInput.value.focus()
    return false
  }

  // In case of slot idnos match.
  materialMatchedRow.correct = true
  materialMatchedRow.materialInventoryIdno = materialFormValue.value.materialInventoryIdno.trim()
  await playSuccseTone()
  tabulator.value.deselectRow( materialMatchedRow.id )

  slotFormValue.value.slotIdno = ''
  materialFormValue.value.materialInventoryIdno = ''
  materialInventoryIdnoInput.value.focus()
  return true
}
</script>



<template>
  <n-space vertical size="large"
    style="padding: 18px 1rem 0 1rem; position: sticky; top: 18px; background-color: var(--modal-color);">
    <n-page-header @back=" onClickBackArrow( $event ) " :title="route.params.workOrderIdno.toString()"></n-page-header>

    <n-grid cols="1 s:2" responsive="screen" x-gap="20">
      <n-gi>
        <n-form size="large" :model=" materialFormValue " @submit.prevent=" onSubmitMaterialInventoryForm( $event ) ">
          <n-form-item label="物料單包條碼">
            <n-input type="text" size="large" v-model:value.lazy=" materialFormValue.materialInventoryIdno " autofocus
              ref="materialInventoryIdnoInput" />
          </n-form-item>
        </n-form>
      </n-gi>

      <n-gi>
        <n-form size="large" :model=" slotFormValue " @submit.prevent=" onSubmitSlotForm( $event ) ">
          <n-form-item label="位置">
            <n-input type="text" size="large" v-model:value.lazy=" slotFormValue.slotIdno " ref="slotIdnoInput" />
          </n-form-item>
        </n-form>
      </n-gi>
    </n-grid>

  </n-space>

  <div style="padding: 1rem">
    <div ref="table"></div>
  </div>
</template>



<style>
.tabulator-col,
.tabulator-cell {
  border: unset !important;
}

.tabulator-selected {
  outline: 1px solid var(--primary-color);
  outline-offset: -1px;
  background-color: var(--primary-color-suppl) !important;
}
</style>
