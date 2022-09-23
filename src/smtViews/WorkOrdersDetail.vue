<script setup lang="ts">
import { InputInst, NEl, NForm, NFormItem, NGi, NGrid, NInput, NPageHeader, useMessage } from 'naive-ui';
import * as Tone from 'tone';
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ApiError, MaterialInventoriesService, StErpService, STWorkOrderItemForSMTMounterCheck } from '../client';

// Slot 太多，只顯示有必要的 slot，其餘不顯示，如果空 slot 被輸入，跳出錯誤訊息。

const route = useRoute();
const router = useRouter();
const message = useMessage();

const workOrderItems = ref<STWorkOrderItemForSMTMounterCheck[]>();

const slotFormValue = ref( { slotIdno: '' } );
const slotIdnoInput = ref<InputInst>();

const materialFormValue = ref( { materialInventoryIdno: '' } );
const materialInventoryIdnoInput = ref<InputInst>();

type SlotMaterial = {
  id: string,
  mounterIdno: string,
  slotSide: string,
  slotNumber: number,
  materialIdno: string,
  materialInventoryIdno: string,
  highlight: boolean,
  correct: boolean | null,
}
const slotMaterialData = ref<SlotMaterial[]>( [] );



onMounted( async () => {
  slotIdnoInput.value.focus();

  try { workOrderItems.value = await StErpService.getStWorkOrderForSmtMounterMatchCheck( { workOrderIdno: route.params.workOrderIdno.toString() } ); }
  catch ( error ) { if ( error instanceof ApiError && error.status === 404 ) { router.push( '/404' ); } }

  for ( let workOrderItem of workOrderItems.value ) {
    slotMaterialData.value.push( {
      id: workOrderItem.slot_side + workOrderItem.slot_number,
      mounterIdno: '',
      slotSide: workOrderItem.slot_side,
      slotNumber: workOrderItem.slot_number,
      materialIdno: workOrderItem.material_idno,
      materialInventoryIdno: '',
      highlight: false,
      correct: null,
    } )
  }

  // // Dummy data entries for testing
  // slotMaterialData.value.push( { id: 'A15', mounterIdno: '', slotSide: 'A', slotNumber: 15, materialIdno: 'M014', materialInventoryIdno: '', highlight: false, correct: null } );
  // slotMaterialData.value.push( { id: 'A16', mounterIdno: '', slotSide: 'A', slotNumber: 16, materialIdno: 'M016', materialInventoryIdno: '', highlight: false, correct: null } );
  // slotMaterialData.value.push( { id: 'A17', mounterIdno: '', slotSide: 'A', slotNumber: 17, materialIdno: 'M017', materialInventoryIdno: '', highlight: false, correct: null } );
  // slotMaterialData.value.push( { id: 'A18', mounterIdno: '', slotSide: 'A', slotNumber: 18, materialIdno: 'M018', materialInventoryIdno: '', highlight: false, correct: null } );
  // slotMaterialData.value.push( { id: 'A19', mounterIdno: '', slotSide: 'A', slotNumber: 19, materialIdno: 'M019', materialInventoryIdno: '', highlight: false, correct: null } );
  // slotMaterialData.value.push( { id: 'A20', mounterIdno: '', slotSide: 'A', slotNumber: 20, materialIdno: 'M020', materialInventoryIdno: '', highlight: false, correct: null } );
  // slotMaterialData.value.push( { id: 'A21', mounterIdno: '', slotSide: 'A', slotNumber: 21, materialIdno: 'M021', materialInventoryIdno: '', highlight: false, correct: null } );
  // slotMaterialData.value.push( { id: 'A23', mounterIdno: '', slotSide: 'A', slotNumber: 23, materialIdno: 'M023', materialInventoryIdno: '', highlight: false, correct: null } );
  // slotMaterialData.value.push( { id: 'A24', mounterIdno: '', slotSide: 'A', slotNumber: 24, materialIdno: 'M024', materialInventoryIdno: '', highlight: false, correct: null } );
  // slotMaterialData.value.push( { id: 'A25', mounterIdno: '', slotSide: 'A', slotNumber: 25, materialIdno: 'M025', materialInventoryIdno: '', highlight: false, correct: null } );
  // slotMaterialData.value.push( { id: 'A27', mounterIdno: '', slotSide: 'A', slotNumber: 27, materialIdno: 'M027', materialInventoryIdno: '', highlight: false, correct: null } );
  // slotMaterialData.value.push( { id: 'A28', mounterIdno: '', slotSide: 'A', slotNumber: 28, materialIdno: 'M028', materialInventoryIdno: '', highlight: false, correct: null } );
  // slotMaterialData.value.push( { id: 'A29', mounterIdno: '', slotSide: 'A', slotNumber: 29, materialIdno: 'M029', materialInventoryIdno: '', highlight: false, correct: null } );
  // slotMaterialData.value.push( { id: 'A30', mounterIdno: '', slotSide: 'A', slotNumber: 30, materialIdno: 'M030', materialInventoryIdno: '', highlight: false, correct: null } );
  // slotMaterialData.value.push( { id: 'A31', mounterIdno: '', slotSide: 'A', slotNumber: 31, materialIdno: 'M031', materialInventoryIdno: '', highlight: false, correct: null } );
  // slotMaterialData.value.push( { id: 'A32', mounterIdno: '', slotSide: 'A', slotNumber: 32, materialIdno: 'M032', materialInventoryIdno: '', highlight: false, correct: null } );
  // slotMaterialData.value.push( { id: 'A33', mounterIdno: '', slotSide: 'A', slotNumber: 33, materialIdno: 'M033', materialInventoryIdno: '', highlight: false, correct: null } );
  // slotMaterialData.value.push( { id: 'A34', mounterIdno: '', slotSide: 'A', slotNumber: 34, materialIdno: 'M034', materialInventoryIdno: '', highlight: false, correct: null } );
} );



function onClickBackArrow ( event: Event ) { router.push( `/smt/mounter/work_orders/` ); }



function parseSlotIdnoInput () {
  // Slot barcode format: mounterId-slotSide-slotNumber
  const slotIdnoArray = slotFormValue.value.slotIdno.trim().split( '-' )
  let slotSide = slotIdnoArray[ 1 ];
  let slotNumber = Number( slotIdnoArray[ 2 ] );
  const id = slotSide + slotNumber;
  return [ slotSide, slotNumber, id ]
}



function scrollToRow ( id: string ) {
  const row = document.querySelector( `#${ id }` );
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



function onSubmitSlotFrom ( event: Event ) {
  if ( !!slotFormValue.value.slotIdno.trim() === false ) {
    message.warning( '請輸入插槽位置' );
    return false;
  }

  const [ slotSide, slotNumber, id ] = parseSlotIdnoInput();
  scrollToRow( id as string );

  slotMaterialData.value.forEach( ( item, index ) => {
    if ( item.id == id ) { item.highlight = true; }
    else { item.highlight = false; }
  } );

  materialInventoryIdnoInput.value.focus();
}



async function onSubmitMaterialInventoryFrom ( event: Event ) {
  if ( !!materialFormValue.value.materialInventoryIdno.trim() === false ) {
    message.warning( '請輸入物料號' );
    return false;
  }

  const [ slotSide, slotNumber, id ] = parseSlotIdnoInput();
  scrollToRow( id as string );

  // Ask material data by WMS material inventory barcode or ST ERP part pack barcode
  let materialIdno = ''

  // Disable this block for testing
  if ( materialFormValue.value.materialInventoryIdno.trim()[ 0 ] == 'A' ) {
    try {
      const partPack = await StErpService.getStErpPartPack( { stPackIdno: materialFormValue.value.materialInventoryIdno.trim() } );
      materialIdno = partPack.part_idno;
    } catch ( error ) {
      if ( error instanceof ApiError && error.status === 404 ) {
        await playErrorTone();
        message.warning( '查無此條碼' );
        return false;
      }
    }
  } else if ( materialFormValue.value.materialInventoryIdno.trim()[ 0 ] == 'M' ) {
    try {
      const materialInventory = await MaterialInventoriesService.getMaterialInventory( { materialInventoryIdno: materialFormValue.value.materialInventoryIdno.trim() } );
      materialIdno = materialInventory.material_idno;
    } catch ( error ) {
      if ( error instanceof ApiError && error.status === 404 ) {
        await playErrorTone();
        message.warning( '查無此條碼' );
        return false;
      }
    }
  } else {
    await playErrorTone();
    message.warning( '查無此條碼' );
    return false;
  }

  // // Dummy code for testing, by position A18.
  // materialIdno = 'M018'; 

  slotMaterialData.value.forEach( async ( item, index ) => {
    if ( item.id == id ) {
      item.highlight = true;
      if ( materialIdno == item.materialIdno ) {
        item.correct = true;
        item.materialInventoryIdno = materialFormValue.value.materialInventoryIdno.trim();
        await playSuccseTone();
      } else {
        item.correct = false;
        await playErrorTone();
        message.error( '錯誤' );
      }
      item.highlight = false;
    }
  } );

  slotFormValue.value.slotIdno = '';
  materialFormValue.value.materialInventoryIdno = '';
  slotIdnoInput.value.focus();
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
        <n-form size="large" :model="slotFormValue" @submit.prevent=" onSubmitSlotFrom( $event )">
          <n-form-item label="位置">
            <n-input type="text" size="large" v-model:value.lazy="slotFormValue.slotIdno" ref="slotIdnoInput" />
          </n-form-item>
        </n-form>
      </n-gi>

      <n-gi>
        <n-form size="large" :model="materialFormValue" @submit.prevent="onSubmitMaterialInventoryFrom( $event )">
          <n-form-item label="物料單包條碼">
            <n-input type="text" size="large" v-model:value.lazy="materialFormValue.materialInventoryIdno"
              ref="materialInventoryIdnoInput" />
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
              <th>位置</th>
              <th>物料號</th>
              <th>單包條碼</th>
            </tr>
          </thead>
          <tbody>
            <!-- Chromium does not handle `scroll-margin-top` correctly. Firefox and WebKit are OK. -->
            <n-el tag="tr" v-for="(slotMaterialItem, index) in slotMaterialData" :key=" slotMaterialItem.id "
              :id="slotMaterialItem.id" style="scroll-margin-top: 180px;"
              :class=" slotMaterialItem.highlight ? 'row-highlight' : '' ">
              <td><span v-if="slotMaterialItem.correct">✅</span></td>
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
