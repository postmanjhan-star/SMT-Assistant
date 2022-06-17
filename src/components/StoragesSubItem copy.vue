<script setup lang="ts">
// 儲位可以加，可以改，不能刪。

import { reactive, h, defineComponent, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { ref, onBeforeMount } from 'vue';
import { NSpace, NH2, NDataTable, NButton, NInput } from 'naive-ui';
import { StorageRead, StoragesService, L2StorageRead, L1StorageRead } from '../client';
import type { DataTableColumns } from 'naive-ui';

const route = useRoute();

const currentValue = ref<StorageRead>( { id: 0, idno: '', name: '', l2_storages: [] } );
// const updateValue = ref();

// const columns = [
//   { title: '儲位代碼', key: 'idno' },
//   { title: '儲位名稱', key: 'name' },
//   { title: '操作', key: 'action' },
// ]

async function ss ( rowData: L2StorageRead ) {
  console.debug( 'ss', rowData.name );
}

const createColumns = (): DataTableColumns<L2StorageRead> => {
  return [
    { title: '儲位代碼', key: 'idno' },
    { title: '儲位名稱', key: 'name' },
    {
      title: '操作', key: 'actions', align: 'right',
      render ( row ) {
        return h(
          NButton,
          { size: 'large', onClick: () => ss( row ) },
          { default: () => '編輯' },
        )
      }
    }
  ]
}

const columns = createColumns();

onBeforeMount( async () => { currentValue.value = await StoragesService.getStorage( route.params.idno.toString() ); } );




const ShowOrEdit = defineComponent( {
  props: {
    value: [ String, Number ],
    onUpdateValue: [ Function, Array ]
  },
  setup ( props ) {
    const isEdit = ref( false )
    const inputRef = ref<typeof NInput>( NInput )
    const inputValue = ref( props.value )
    function handleOnClick () {
      isEdit.value = true
      nextTick( () => {
        inputRef.value.focus()
      } )
    }
    function handleChange () {
      props.onUpdateValue( inputValue.value )
      isEdit.value = false
    }
    return () =>
      h(
        'div',
        {
          onClick: handleOnClick
        },
        isEdit.value
          ? h( NInput, {
            ref: inputRef,
            value: inputValue.value,
            onUpdateValue: ( v ) => {
              inputValue.value = v
            },
            onChange: handleChange,
            onBlur: handleChange
          } )
          : props.value
      )
  }
} )




const columns2 = [
  {
    title: 'idno', key: 'idno',
    render ( row, index ) {
      return h( ShowOrEdit, {
        value: row.idno,
        onUpdateValue ( v: string ) { currentValue.value.l2_storages[ index ].idno = v }
      } )
    }
  },
  {
    title: 'name', key: 'name',
    render ( row, index ) {
      return h( ShowOrEdit, {
        value: row.name,
        onUpdateValue ( v: string ) { currentValue.value.l2_storages[ index ].name = v }
      } )
    }
  },
]




</script>

<template>
  <div style="padding: 1rem;">
    <n-space size="large" item-style="height: 40px; vertical-align: center" :align=" 'center' ">
      <n-h2 style="font-size: 1.2rem; margin-bottom: unset;">儲位</n-h2>
    </n-space>

    <n-space vertical size="large"
      style="background-color: white; padding: 1rem; box-shadow: 0px 4px 20px -4px hsla(0, 0%, 60%, 0.4)">

      <n-data-table :columns=" columns " :data=" currentValue.l2_storages " striped :single-line=" true ">
      </n-data-table>

      <n-data-table :key=" ( row ) => row.key " :columns=" columns2 " :data=" currentValue.l2_storages " />

    </n-space>
  </div>
</template>

<style>
</style>
