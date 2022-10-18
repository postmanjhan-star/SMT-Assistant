<script setup lang="ts">
import { ColDef, GetRowIdParams, GridOptions, GridReadyEvent, RowDoubleClickedEvent } from "ag-grid-community";
import "ag-grid-community/dist/styles/ag-grid.css"; // Core grid CSS, always needed
import "ag-grid-community/dist/styles/ag-theme-alpine.css"; // Optional theme CSS
import { AgGridVue } from "ag-grid-vue3"; // the AG Grid Vue Component
import { NA, NBreadcrumb, NBreadcrumbItem, NButton, NH1, NSpace, useMessage } from 'naive-ui';
import { onBeforeMount, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { IssuanceReturnRead, IssuancesService, OpenAPI } from '../client';
import { useAuthStore } from '../stores/auth';



const message = useMessage();
const router = useRouter();

const authStore = useAuthStore();
OpenAPI.TOKEN = JSON.parse( authStore.accountToken )[ 'access_token' ];

const gridApi = ref();
const gridColumnApi = ref();

let issuanceReturnList: IssuanceReturnRead[];

type Row = {
    id: number,
    idno: string,
    date: string,
    employeeIdno: string,
    materialIdno: string,
    materialInventoryIdno: string,
    returnQuantity: number,
}

const rowData = ref<Row[]>( [] );

const defaultColDef: ColDef = {
    editable: false,
    filter: true,
    sortable: true,
    resizable: true,
}

const columnDefs: ColDef[] = [
    { field: "idno", headerName: '退回單號' },
    { field: "date", headerName: '退回日期' },
    { field: "materialIdno", headerName: '材料代碼' },
    { field: "materialInventoryIdno", headerName: '材料單包代碼' },
    { field: "returnQuantity", headerName: '退回數量' },
    // { field: "employeeIdno", headerName: '辦理人' }, // 暫時不顯示。
]


const gridOptions: GridOptions = {
    columnDefs: columnDefs,
    defaultColDef: defaultColDef,
    stopEditingWhenCellsLoseFocus: true,
    enterMovesDownAfterEdit: true,
    undoRedoCellEditing: true,
    debug: false,
    pagination: true,
    suppressColumnVirtualisation: true,
    suppressRowTransform: true,
    debounceVerticalScrollbar: true,
    enableCellTextSelection: true,

    rowSelection: 'single',
    suppressCellFocus: true,
    onRowDoubleClicked: ( event: RowDoubleClickedEvent ) => { },
}



onBeforeMount( async () => {
    issuanceReturnList = await IssuancesService.getIssuacneReturnList();

    for ( let issuanceReturn of issuanceReturnList ) {
        rowData.value.push( {
            id: issuanceReturn.id,
            idno: issuanceReturn.idno,
            date: issuanceReturn.date,
            employeeIdno: issuanceReturn.employee_idno,
            materialIdno: issuanceReturn.material_idno,
            materialInventoryIdno: issuanceReturn.material_inventory_idno,
            returnQuantity: issuanceReturn.return_quantity,
        } );
    }
} );



function getRowId ( params: GetRowIdParams ) { return params.data.id; }



function onGridReady ( params: GridReadyEvent ) {
    gridApi.value = params.api;
    gridColumnApi.value = params.columnApi;
};



function onClickCreateIssuanceReturnButton () { router.push( '/issuance_returns/create' ); }
</script>
    
    
<template>
    <main
        style="min-height: calc(100vh - 60px); background-color: hsla(0, 0%, 92%, 1.0); background-image: url('/pattern.svg'); background-repeat: repeat-x; background-position: center; background-size: cover;">
        <n-breadcrumb
            style="padding: 1rem; box-shadow: 0px 4px 20px -4px hsla(0, 0%, 60%, 0.4); position: relative; background-color: white; z-index: 1; overflow: auto;">
            <n-breadcrumb-item>
                <router-link to="/home" #=" { navigate, href } " custom>
                    <n-a :href=" href " @click=" navigate ">首頁</n-a>
                </router-link>
            </n-breadcrumb-item>
            <n-breadcrumb-item>收發作業</n-breadcrumb-item>
            <n-breadcrumb-item>發料退回作業</n-breadcrumb-item>
        </n-breadcrumb>

        <div style="padding: 1rem;">
            <n-h1 prefix="bar" style="font-size: 1.4rem;">發料退回作業</n-h1>
            <n-space vertical size="large"
                style="background-color: white; padding: 1rem; box-shadow: 0px 4px 20px -4px hsla(0, 0%, 60%, 0.4)">

                <n-space size="large" style="">
                    <n-button type="primary" @click=" onClickCreateIssuanceReturnButton() ">建立發料退回單</n-button>
                </n-space>

                <div style="height: 600px; overflow-x: scroll; width: 100%;">
                    <ag-grid-vue class="ag-theme-alpine" :rowData=" rowData " style="height: 100%;"
                        :gridOptions=" gridOptions " :getRowId=" getRowId " :onGridReady=" onGridReady "></ag-grid-vue>
                </div>

            </n-space>
        </div>
    </main>
</template>
    