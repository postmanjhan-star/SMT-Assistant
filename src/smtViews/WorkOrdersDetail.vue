<script setup lang="ts">
import { InputInst, NEl, NForm, NFormItem, NGi, NGrid, NInput, NPageHeader, useMessage } from 'naive-ui';
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ApiError, StErpService, STWorkOrderItem } from '../client';
import * as Tone from 'tone';

// Slot 太多，只顯示有必要的 slot，其餘不顯示，如果空 slot 被輸入，跳出錯誤訊息。

const route = useRoute();
const router = useRouter();
const message = useMessage();

const workOrderItems = ref<STWorkOrderItem[]>();

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
  materialInventoryStBarcode: string,
  highlight: boolean,
  correct: boolean | null,
}
const slotMaterialData = ref<SlotMaterial[]>( [] );



onMounted( async () => {
  slotIdnoInput.value.focus();

  try { workOrderItems.value = await StErpService.getStWorkOrder( { workOrderIdno: route.params.workOrderIdno.toString() } ); }
  catch ( error ) { if ( error instanceof ApiError && error.status === 404 ) { router.push( '/404' ); } }

  // Dummy data entries for testing
  slotMaterialData.value.push( { id: 'A1', mounterIdno: 'MNTR001', slotSide: 'A', slotNumber: 1, materialIdno: 'M001', materialInventoryIdno: 'MINV20220920001', materialInventoryStBarcode: 'A001002', highlight: false, correct: null } );
  slotMaterialData.value.push( { id: 'A3', mounterIdno: 'MNTR001', slotSide: 'A', slotNumber: 3, materialIdno: 'M002', materialInventoryIdno: 'MINV20220920002', materialInventoryStBarcode: 'A001003', highlight: false, correct: null } );
  slotMaterialData.value.push( { id: 'A4', mounterIdno: 'MNTR001', slotSide: 'A', slotNumber: 4, materialIdno: 'M003', materialInventoryIdno: 'MINV20220920004', materialInventoryStBarcode: 'A001005', highlight: false, correct: null } );
  slotMaterialData.value.push( { id: 'A5', mounterIdno: 'MNTR001', slotSide: 'A', slotNumber: 5, materialIdno: 'M004', materialInventoryIdno: 'MINV20220920006', materialInventoryStBarcode: 'A001006', highlight: false, correct: null } );
  slotMaterialData.value.push( { id: 'A6', mounterIdno: 'MNTR001', slotSide: 'A', slotNumber: 6, materialIdno: 'M006', materialInventoryIdno: 'MINV20220920007', materialInventoryStBarcode: 'A001008', highlight: false, correct: null } );
  slotMaterialData.value.push( { id: 'A7', mounterIdno: 'MNTR001', slotSide: 'A', slotNumber: 7, materialIdno: 'M007', materialInventoryIdno: 'MINV20220920008', materialInventoryStBarcode: 'A001009', highlight: false, correct: null } );
  slotMaterialData.value.push( { id: 'A8', mounterIdno: 'MNTR001', slotSide: 'A', slotNumber: 8, materialIdno: 'M008', materialInventoryIdno: 'MINV20220920009', materialInventoryStBarcode: 'A001010', highlight: false, correct: null } );
  slotMaterialData.value.push( { id: 'A9', mounterIdno: 'MNTR001', slotSide: 'A', slotNumber: 9, materialIdno: 'M009', materialInventoryIdno: 'MINV20220920010', materialInventoryStBarcode: 'A001011', highlight: false, correct: null } );
  slotMaterialData.value.push( { id: 'A10', mounterIdno: 'MNTR001', slotSide: 'A', slotNumber: 10, materialIdno: 'M010', materialInventoryIdno: 'MINV20220920011', materialInventoryStBarcode: 'A001012', highlight: false, correct: null } );
  slotMaterialData.value.push( { id: 'A11', mounterIdno: 'MNTR001', slotSide: 'A', slotNumber: 11, materialIdno: 'M011', materialInventoryIdno: 'MINV20220920012', materialInventoryStBarcode: 'A001013', highlight: false, correct: null } );
  slotMaterialData.value.push( { id: 'A13', mounterIdno: 'MNTR001', slotSide: 'A', slotNumber: 12, materialIdno: 'M013', materialInventoryIdno: 'MINV20220920014', materialInventoryStBarcode: 'A001014', highlight: false, correct: null } );
  slotMaterialData.value.push( { id: 'A14', mounterIdno: 'MNTR001', slotSide: 'A', slotNumber: 14, materialIdno: 'M014', materialInventoryIdno: 'MINV20220920015', materialInventoryStBarcode: 'A001015', highlight: false, correct: null } );
  slotMaterialData.value.push( { id: 'A15', mounterIdno: 'MNTR001', slotSide: 'A', slotNumber: 16, materialIdno: 'M015', materialInventoryIdno: 'MINV20220920016', materialInventoryStBarcode: 'A001016', highlight: false, correct: null } );
  slotMaterialData.value.push( { id: 'A17', mounterIdno: 'MNTR001', slotSide: 'A', slotNumber: 17, materialIdno: 'M017', materialInventoryIdno: 'MINV20220920017', materialInventoryStBarcode: 'A001017', highlight: false, correct: null } );
  slotMaterialData.value.push( { id: 'A18', mounterIdno: 'MNTR001', slotSide: 'A', slotNumber: 18, materialIdno: 'M018', materialInventoryIdno: 'MINV20220920018', materialInventoryStBarcode: 'A001018', highlight: false, correct: null } );
  slotMaterialData.value.push( { id: 'A19', mounterIdno: 'MNTR001', slotSide: 'A', slotNumber: 19, materialIdno: 'M019', materialInventoryIdno: 'MINV20220920019', materialInventoryStBarcode: 'A001019', highlight: false, correct: null } );
  slotMaterialData.value.push( { id: 'A20', mounterIdno: 'MNTR001', slotSide: 'A', slotNumber: 20, materialIdno: 'M020', materialInventoryIdno: 'MINV20220920020', materialInventoryStBarcode: 'A001020', highlight: false, correct: null } );
  slotMaterialData.value.push( { id: 'A21', mounterIdno: 'MNTR001', slotSide: 'A', slotNumber: 21, materialIdno: 'M021', materialInventoryIdno: 'MINV20220920021', materialInventoryStBarcode: 'A001021', highlight: false, correct: null } );
} );


function onClickBackArrow ( event: Event ) { router.push( `/smt/mounter/work_orders/` ); }


function parseSlotIdnoInput () {
  const slotIdnoArray = slotFormValue.value.slotIdno.trim().split( '-' )
  let slotSide = slotIdnoArray[ 1 ];
  let slotNumber = Number( slotIdnoArray[ 2 ] );
  // slotSide = 'A';
  // slotNumber = 8;
  const id = slotSide + slotNumber;
  return [ slotSide, slotNumber, id ]
}



function scrollToRow ( id: string ) {
  const row = document.querySelector( `#${ id }` );
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
    message.warning( '請輸入插槽位置' )
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
    message.warning( '請輸入物料號' )
    return false;
  }
  console.debug( materialFormValue.value.materialInventoryIdno.trim() );

  const [ slotSide, slotNumber, id ] = parseSlotIdnoInput();
  scrollToRow( id as string );

  slotMaterialData.value.forEach( async ( item, index ) => {
    if ( item.id == id ) {
      item.highlight = true;
      if ( materialFormValue.value.materialInventoryIdno == item.materialInventoryIdno ) {
        item.correct = true;
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
              <th>WMS 單包條碼</th>
              <th>ERP 單包條碼</th>
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
              <td>{{slotMaterialItem.materialInventoryStBarcode}}</td>
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
