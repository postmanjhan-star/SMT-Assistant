<script setup>
import { ref, reactive, onMounted } from "vue";
import { useRoute } from "vue-router";
import { AgGridVue } from "ag-grid-vue3";  // the AG Grid Vue Component
import "ag-grid-community/dist/styles/ag-grid.css"; // Core grid CSS, always needed
import "ag-grid-community/dist/styles/ag-theme-alpine.css"; // Optional theme CSS
import { OpenAPI, StoragesService } from "../client";

const route = useRoute();

const gridApi = ref( null ); // Optional - for accessing Grid's API
const gridColumnApi = ref( null ); // Optional - for accessing Grid's API

// Obtain API from grid's onGridReady event
const onGridReady = ( params ) => {
    gridApi.value = params.api;
    gridColumnApi.value = params.columnApi;
};

const rowData = reactive( {} ); // Set rowData to Array of Objects, one Object per Row

// Each Column Definition results in one Column.
const columnDefs = reactive( {
    value: [
        { field: "idno", editable: true },
        { field: "name", editable: true },
    ]
} );

// Example load data from sever
const idno = 'C';
onMounted( async () => {
    const response = await StoragesService.getStorage( idno );
    rowData.value = response.l2_storages;
} );

const cellWasClicked = ( event ) => { // Example of consuming Grid Event
    console.log( "cell was clicked", event );
}

const gridOptions = {
    // PROPERTIES
    // Objects like myRowData and myColDefs would be created in your application
    suppressClipboardPaste: true,

    columnDefs: columnDefs.value,
    defaultColDef: { sortable: true, filter: true }, // DefaultColDef sets props common to all Columns
    stopEditingWhenCellsLoseFocus: true,
    enterMovesDown: true,
    enterMovesDownAfterEdit: true,
    undoRedoCellEditing: true,
    debug: false,
    pagination: true,

    // EVENTS
    // Add event handlers
    onRowClicked: event => console.log( 'A row was clicked' ),
    onColumnResized: event => console.log( 'A column was resized' ),
    onGridReady: event => onGridReady(),
    onCellClicked: event => cellWasClicked(),

    // CALLBACKS
    // getRowHeight: ( params ) => 25
}
</script>


<template>
    <button @click=" gridApi.deselectAll() ">deselect rows</button>

    <ag-grid-vue class="ag-theme-alpine" style="height: 400px" :rowData=" rowData.value " :gridOptions=" gridOptions ">
    </ag-grid-vue>
</template>
 