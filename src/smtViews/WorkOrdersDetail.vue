<script setup lang="ts">
import { InputInst, NEl, NForm, NFormItem, NGi, NGrid, NInput, NPageHeader, useMessage } from 'naive-ui';
import * as Tone from 'tone';
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ApiError, MaterialInventoriesService, StErpService, STWorkOrderItemForSMTMounterCheck, SmtMounterFstRead } from '../client';

// Slot 太多，只顯示有必要的 slot，其餘不顯示，如果空 slot 被輸入，跳出錯誤訊息。

const route = useRoute();
const router = useRouter();
const message = useMessage();

const workOrderItems = ref<STWorkOrderItemForSMTMounterCheck[]>();
const smtMounterFstArray = ref<SmtMounterFstRead[]>();

const slotFormValue = ref( { slotIdno: '' } );
const slotIdnoInput = ref<InputInst>();

const materialFormValue = ref( { materialInventoryIdno: '' } );
const materialInventoryIdnoInput = ref<InputInst>();

type SlotMaterial = {
  id: number,
  mounterIdno: string,
  boardSide: string,
  slotSide: string,
  slotNumber: number,
  slotPosition: string,
  materialIdno: string,
  materialInventoryIdno: string,
  highlight: boolean,
  correct: boolean | null,
}
const slotMaterialData = ref<SlotMaterial[]>( [] );
let materialIdno;


onMounted( async () => {
  try { smtMounterFstArray.value = await StErpService.getSmtMounterCheckData( { workOrderIdno: route.params.workOrderIdno.toString() } ) }
  catch ( error ) { if ( error instanceof ApiError && error.status === 404 ) { router.push( '/404' ); } }

  for ( let masterData of smtMounterFstArray.value ) {
    for ( let detailData of masterData.smt_mounter_fst_items ) {
      slotMaterialData.value.push( {
        id: detailData.id,
        mounterIdno: masterData.mounter_idno,
        boardSide: masterData.board_side,
        slotSide: detailData.stage,
        slotNumber: detailData.slot,
        slotPosition: detailData.stage + detailData.slot,
        materialIdno: detailData.part_number,
        materialInventoryIdno: '',
        highlight: false,
        correct: null,
      } )
    }
  }
} );



function onClickBackArrow ( event: Event ) { router.push( `/smt/mounter/work_orders/` ); }



function parseSlotIdnoInput () {
  // Slot barcode format: mounterId-slotSide-slotNumber
  const slotIdnoArray = slotFormValue.value.slotIdno.trim().split( '-' )
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
  const id = slotSide + slotNumber;
  return [ slotSide, slotNumber, id ]
}



function scrollToRow ( id: string ) {
  console.debug( id )
  const row = document.querySelector( `[id='${ id }']` );
  if ( !!row === false ) {
    message.warning( '無此位置' );
    throw Error;
  }
  row.scrollIntoView( { behavior: 'smooth' } );
}



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



async function onSubmitMaterialInventoryForm ( event: Event ) {
  if ( !!materialFormValue.value.materialInventoryIdno.trim() === false ) {
    message.warning( '請輸入物料號' );
    return false;
  }

  // Ask material data by WMS material inventory barcode or ST ERP part pack barcode
  if ( materialFormValue.value.materialInventoryIdno.trim().slice( 0, 4 ) == 'MINV' ) {
    try {
      const materialInventory = await MaterialInventoriesService.getMaterialInventory( { materialInventoryIdno: materialFormValue.value.materialInventoryIdno.trim() } );
      materialIdno = materialInventory.material_idno;
    } catch ( error ) {
      if ( error instanceof ApiError && error.status === 404 ) {
        await playErrorTone();
        message.warning( '查無此條碼' );
        materialFormValue.value.materialInventoryIdno = '';
        return false;
      }
    }
  } else {
    try {
      const partPack = await StErpService.getStErpPartPack( { stPackIdno: materialFormValue.value.materialInventoryIdno.trim() } );
      materialIdno = partPack.part_idno;
    } catch ( error ) {
      if ( error instanceof ApiError && error.status === 404 ) {
        await playErrorTone();
        message.warning( '查無此條碼' );
        materialFormValue.value.materialInventoryIdno = '';
        return false;
      }
    }
  }

  slotMaterialData.value.forEach( async ( item, index ) => {
    if ( item.materialIdno == materialIdno ) { item.highlight = true; }
    else { item.highlight = false; }
    scrollToRow( materialIdno );
  } );

  slotIdnoInput.value.focus();
}



async function onSubmitSlotForm ( event: Event ) {
  if ( !!slotFormValue.value.slotIdno.trim() === false ) {
    message.warning( '請輸入插槽位置' );
    return false;
  }

  const [ slotSide, slotNumber, id ] = parseSlotIdnoInput();

  
  for ( let slotMaterialItem of slotMaterialData.value ) {
    if ( slotMaterialItem.slotPosition == id ) {
      slotMaterialItem.highlight = true;
      if ( materialIdno == slotMaterialItem.materialIdno ) {
        slotMaterialItem.correct = true;
        slotMaterialItem.materialInventoryIdno = materialFormValue.value.materialInventoryIdno.trim();
        await playSuccseTone();
        slotMaterialItem.highlight = false;
        break;
      } else {
        slotMaterialItem.correct = false;
        await playErrorTone();
        message.error( '錯誤' );
        break;
      }
    } else {
      slotMaterialItem.correct = false;
      await playErrorTone();
      message.error( '錯誤' );
      break;
    }
  }

  slotFormValue.value.slotIdno = '';
  materialFormValue.value.materialInventoryIdno = '';
  materialInventoryIdnoInput.value.focus();
}

// Take background colors from https://windicss.org/utilities/general/colors.html
</script>



<template>
  <n-space vertical size="large"
    style="padding: 18px 1rem 0 1rem; position: sticky; top: 18px; background-color: #292524; border-bottom: 2px solid #1c1917;">
    <n-page-header @back="onClickBackArrow( $event ) " :title="route.params.workOrderIdno.toString()" style="">
    </n-page-header>

    <n-grid cols="1 s:2" responsive="screen" x-gap="20">
      <n-gi>
        <n-form size="large" :model="materialFormValue" @submit.prevent="onSubmitMaterialInventoryForm( $event )">
          <n-form-item label="物料單包條碼">
            <n-input type="text" size="large" v-model:value.lazy="materialFormValue.materialInventoryIdno" autofocus
              ref="materialInventoryIdnoInput" />
          </n-form-item>
        </n-form>
      </n-gi>

      <n-gi>
        <n-form size="large" :model="slotFormValue" @submit.prevent=" onSubmitSlotForm( $event )">
          <n-form-item label="位置">
            <n-input type="text" size="large" v-model:value.lazy="slotFormValue.slotIdno" ref="slotIdnoInput" />
          </n-form-item>
        </n-form>
      </n-gi>
    </n-grid>

  </n-space>

  <n-space vertical size="large" style="padding: 1rem;">
    <n-grid cols="1 s:1" responsive="screen" x-gap="20">

      <n-gi>
        <n-table size="large" :striped="false" :bordered="false" :single-line="true"
          style="box-shadow: 0px 4px 20px -4px hsla(0, 0%, 20%, 1.0);">
          <thead>
            <tr>
              <th style="width: 40px;"></th>
              <th>機台</th>
              <th>PCB 板打件面</th>
              <th>位置</th>
              <th>物料號</th>
              <th>單包條碼</th>
            </tr>
          </thead>
          <tbody>
            <!-- Chromium does not handle `scroll-margin-top` correctly. Firefox and WebKit are OK. -->
            <n-el tag="tr" v-for="(slotMaterialItem, index) in slotMaterialData" :key=" slotMaterialItem.id "
              :id="slotMaterialItem.materialIdno" style="scroll-margin-top: 180px;"
              :class=" slotMaterialItem.highlight ? 'row-highlight' : '' ">
              <td><span v-if="slotMaterialItem.correct">✅</span></td>
              <td>{{slotMaterialItem.mounterIdno}}</td>
              <td>{{slotMaterialItem.boardSide}}</td>
              <td>{{slotMaterialItem.slotSide}}{{slotMaterialItem.slotNumber}}</td>
              <td>{{slotMaterialItem.materialIdno}}</td>
              <td>{{slotMaterialItem.materialInventoryIdno}}</td>
            </n-el>
          </tbody>
        </n-table>
      </n-gi>

    </n-grid>

  </n-space>
</template>



<style>
.row-highlight {
  outline: 1px solid var(--primary-color);
  outline-offset: -2px;
}

.row-highlight td {
  background-color: var(--primary-color-suppl);
}
</style>
