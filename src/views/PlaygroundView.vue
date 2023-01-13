<script setup lang="ts">
import { TabulatorFull as Tabulator } from 'tabulator-tables' //import Tabulator library
import "tabulator-tables/dist/css/tabulator.min.css"
import { onMounted, reactive, ref } from 'vue'


const table = ref( null ) //reference to your table element
const tabulator = ref( null ) //variable to hold your table
const tableData = reactive( [ //data for table to display
  { id: 1, name: "Oli Bob", age: "12", col: "red", dob: "" },
  { id: 2, name: "Mary May", age: "1", col: "blue", dob: "14/05/1982" },
  { id: 3, name: "Christine Lobowski", age: "42", col: "green", dob: "22/05/1982" },
  { id: 4, name: "Brendon Philips", age: "125", col: "orange", dob: "01/08/1980" },
  { id: 5, name: "Margret Marmajuke", age: "16", col: "yellow", dob: "31/01/1999" },
] )


onMounted( async () => {
  //instantiate Tabulator when element is mounted
  tabulator.value = new Tabulator( table.value, {
    height: '100%', // set height of table (in CSS or here), this enables the Virtual DOM and improves render speed dramatically (can be any valid css height value)
    data: tableData, //link data to table
    layout: "fitColumns", //fit columns to width of table (optional)
    reactiveData: true, //enable data reactivity
    locale: true, //auto detect the current language.
    columns: [ //define table columns
      { title: "Name", field: "name", width: 150, headerFilter: "input" },
      { title: "Age", field: "age", hozAlign: "left", formatter: "progress", headerFilter: 'progress' },
      { title: "Favourite Color", field: "col", headerFilter: 'list' },
      { title: "Date Of Birth", field: "dob", sorter: "date", hozAlign: "center", headerFilter: 'date' },
    ],
  } )
} )
</script>



<template>
  <div ref="table" style="height: 200px; z-index: 9999999"></div>
</template>
