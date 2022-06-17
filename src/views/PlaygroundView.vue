<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { AgGridVue } from "ag-grid-vue3";  // the AG Grid Vue Component
import "ag-grid-community/dist/styles/ag-grid.css"; // Core grid CSS, always needed
import "ag-grid-community/dist/styles/ag-theme-alpine.css"; // Optional theme CSS
import { OpenAPI, StoragesService, L2StorageRead } from "../client";
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
OpenAPI.TOKEN = JSON.parse( authStore.accountToken )[ 'access_token' ];

const rowData = ref<L2StorageRead[]>( [] ); // Set rowData to Array of Objects, one Object per Row
const gridApi = ref();
const gridColumnApi = ref();

// DefaultColDef sets props common to all Columns
const defaultColDef = {
    editable: true,
    filter: true,
    // floatingFilter: true,
    sortable: true,
    flex: 1,
    resizable: true,
}

// Each Column Definition results in one Column.
const columnDefs = reactive( {
    value: [
        { field: "idno", headerName: '儲位代碼' },
        { field: "name", headerName: '儲位名稱' },
    ]
} );

const gridOptions = {
    columnDefs: columnDefs.value,
    defaultColDef: defaultColDef,
    stopEditingWhenCellsLoseFocus: true,
    enterMovesDownAfterEdit: true,
    undoRedoCellEditing: true,
    debug: false,
    pagination: true,
    suppressColumnVirtualisation: true,
    suppressRowTransform: true,
    debounceVerticalScrollbar: true,

}

const idno = 'C';
onMounted( async () => {
    // Handle error here
    const response = await StoragesService.getStorage( idno );
    rowData.value = response.l2_storages;
} );

function getRowId ( params ) { return params.data.id; }

function onGridReady ( params ) {
    gridApi.value = params.api;
    gridColumnApi.value = params.columnApi;
    console.debug( gridApi.value );
    console.debug( gridColumnApi.value );
};

function test () {
    const rowNode = gridApi.value.getRowNode( '5' );
    console.debug( rowNode );
}

function test2 () {
    rowData.value.unshift( { id: 7, idno: '', name: '' } );
}

function test3 () {
    console.debug( rowData.value );
}
</script>


<template>
    <button @click=" test ">test</button>
    <button @click=" test2 ">test2</button>
    <button @click=" test3 ">test3</button>

    <ag-grid-vue class="ag-theme-alpine" :rowData=" rowData " :gridOptions=" gridOptions " :getRowId=" getRowId "
        :onGridReady=" onGridReady " style="height: 400px;">
    </ag-grid-vue>
</template>
 