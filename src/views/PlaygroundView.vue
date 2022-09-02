<script setup lang="ts">
import NumberColumnType from '@revolist/revogrid-column-numeral';
import VGrid from "@revolist/vue3-datagrid";
import { NButton, NGi, NGrid, NSpace, useMessage } from 'naive-ui';
import { onBeforeMount, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ApiError, IssuanceItemRead, IssuanceRead, IssuancesService, OpenAPI } from '../client';
import { useAuthStore } from '../stores/auth';

const message = useMessage();
const router = useRouter();
const route = useRoute();

const authStore = useAuthStore();
OpenAPI.TOKEN = JSON.parse( authStore.accountToken )[ 'access_token' ];

const gridApi = ref();

const plugin = { 'numeric': new NumberColumnType( '4,0' ) };


const columns = [
  {
    prop: "picked", name: '已備料', autoSize: true, sortable: true, size: 120,
    columnProperties: ( { prop, model, data, column } ) => { return { style: { border: '1px solid hsla(0, 0%, 90%, 1.0)', backgroundColor: 'hsla(0, 0%, 90%, 1.0)' } } },
    cellProperties: ( { prop, model, data, column } ) => { return { style: { border: '1px solid hsla(0, 0%, 90%, 1.0)' } } },
  },
  {
    prop: "materialInventoryIdno", name: '單包代碼', autoSize: true, sortable: true, size: 120,
    columnProperties: ( { prop, model, data, column } ) => { return { style: { border: '1px solid hsla(0, 0%, 90%, 1.0)', backgroundColor: 'hsla(0, 0%, 90%, 1.0)' } } },
    cellProperties: ( { prop, model, data, column } ) => { return { style: { border: '1px solid hsla(0, 0%, 90%, 1.0)' } } },
  },
  {
    prop: "materialIdno", name: '物料代碼', autoSize: true, sortable: true, size: 120,
    columnProperties: ( { prop, model, data, column } ) => { return { style: { border: '1px solid hsla(0, 0%, 90%, 1.0)', backgroundColor: 'hsla(0, 0%, 90%, 1.0)' } } },
    cellProperties: ( { prop, model, data, column } ) => { return { style: { border: '1px solid hsla(0, 0%, 90%, 1.0)' } } },
  },
  {
    prop: "issueQty", name: '發出數量', autoSize: true, sortable: true, filter: 'number', size: 120, columnType: 'numeric',
    columnProperties: ( { prop, model, data, column } ) => { return { style: { border: '1px solid hsla(0, 0%, 90%, 1.0)', backgroundColor: 'hsla(0, 0%, 90%, 1.0)' } } },
    cellProperties: ( { prop, model, data, column } ) => { return { style: { textAlign: 'right', paddingRight: '1em', border: '1px solid hsla(0, 0%, 90%, 1.0)' } } },
  },
  {
    prop: "lendQty", name: '借出數量', autoSize: true, sortable: true, filter: 'number', size: 120, columnType: 'numeric',
    columnProperties: ( { prop, model, data, column } ) => { return { style: { border: '1px solid hsla(0, 0%, 90%, 1.0)', backgroundColor: 'hsla(0, 0%, 90%, 1.0)' } } },
    cellProperties: ( { prop, model, data, column } ) => { return { style: { textAlign: 'right', paddingRight: '1em', border: '1px solid hsla(0, 0%, 90%, 1.0)' } } },
  },
]

const rows = [
  { picked: true, materialInventoryIdno: "Item 1", materialIdno: 'Material001', issueQty: 20, lendQty: 30 },
  { picked: true, materialInventoryIdno: "Item 2", materialIdno: 'Material002', issueQty: 40, lendQty: 70 },
]



type GridItem = {
  id: number,
  material_idno: string,
  material_inventory_id: number,
  material_inventory_idno: string,
  issue_qty: number,
  lend_qty: number,
};



const rowData = ref<GridItem[]>( [] );



onBeforeMount( async () => {
  let issuance: IssuanceRead;
  try {
    // issuance = await IssuancesService.getIssuance( route.params.idno.toString() );
    for ( let issuanceItem of issuance.issuance_items as IssuanceItemRead[] ) {
      rowData.value.push( {
        id: issuanceItem.id,
        material_idno: issuanceItem.material_idno,
        material_inventory_id: issuanceItem.material_inventory_id,
        material_inventory_idno: issuanceItem.material_inventory_idno,
        issue_qty: issuanceItem.issue_qty,
        lend_qty: issuanceItem.lend_qty,
      } )
    }
  } catch ( error ) { if ( error instanceof ApiError && error.status === 404 ) { router.push( '/404' ); } }
} );



async function handleUpdateIssuanceButtonClick ( event: Event ) {
  // Create issuance
  let issuance: IssuanceRead;

  message.success( `發料單 ${ issuance.idno } 更新成功` );
  router.push( '/issuances' );
}


async function onClickRemoveRowButton ( event: Event ) {
  // Get selected rows
  const selectedRows: GridItem[] = gridApi.value.getSelectedRows();
  if ( selectedRows.length === 0 ) { return false; }
  if ( selectedRows.length > 1 ) {
    message.warning( '請選擇單列' );
    return false;
  }

  const selectedRow = selectedRows[ 0 ];

  try {
    const success = await IssuancesService.removeItem( { issuanceIdno: route.params.idno.toString(), issuanceItemId: selectedRow.id } );
    message.success( '已刪除 🗑️' );

    // Remove the row from grid
    rowData.value = rowData.value.filter( row => row.material_inventory_idno !== selectedRows[ 0 ].material_inventory_idno );
    gridApi.value.setRowData( rowData.value );
  } catch ( error ) {
    message.error( '刪除失敗' );
    return false;
  }
}
</script>
    
    
    
<template>
  <main
    style="min-height: calc(100vh - 60px); background-color: hsla(0, 0%, 92%, 1.0); background-image: url('/pattern.svg'); background-repeat: repeat-x; background-position: center; background-size: cover;">

    <div style="padding: 1rem;">

      <n-space vertical size="large"
        style="background-color: white; padding: 1rem; box-shadow: 0px 4px 20px -4px hsla(0, 0%, 60%, 0.4)">

        <n-grid cols="1 s:3" responsive="screen" x-gap="20">

          <n-gi span="3">
            <n-space size="large" vertical>

              <n-space size="large" style="margin-bottom: 1rem;">
                <n-button type="error" tertiary @click=" onClickRemoveRowButton( $event ) " attr-type="button">刪除單列
                </n-button>
              </n-space>

              <v-grid theme="compact" :columns=" columns " :source=" rows " :autoSizeColumn=" true " resize filter
                readonly stretch row-headers :columnTypes=" plugin "
                style="height: 400px; border: 1px solid hsla(0, 0%, 80%, 1.0);">
              </v-grid>

              <n-button type="primary" block size="large" @click=" handleUpdateIssuanceButtonClick( $event ) "
                attr-type="submit">
                確定備料
              </n-button>
            </n-space>

          </n-gi>

        </n-grid>
      </n-space>
    </div>
  </main>
</template>
    