<script setup lang="ts">
import { ColDef, GetRowIdParams, GridReadyEvent, RowDoubleClickedEvent } from "ag-grid-community";
import "ag-grid-community/dist/styles/ag-grid.css"; // Core grid CSS, always needed
import "ag-grid-community/dist/styles/ag-theme-alpine.css"; // Optional theme CSS
import { AgGridVue } from "ag-grid-vue3"; // the AG Grid Vue Component
import { format } from 'date-fns';
import { NA, NBreadcrumb, NBreadcrumbItem, NButton, NH1, NSpace, NTooltip, useMessage } from 'naive-ui';
import { onBeforeMount, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { ApiError, MaterialsService, OpenAPI, StErpService, STWorkOrder } from '../client';
import { useAuthStore } from '../stores/auth';


const message = useMessage();
const router = useRouter();


const authStore = useAuthStore();
OpenAPI.TOKEN = JSON.parse( authStore.accountToken )[ 'access_token' ];

const gridApi = ref();
const gridColumnApi = ref();


type Row = {
    workOrderIdno: string,
    productIdno: string,
    issueDate: string,
    dueDate: string,
    quantity: number,
    productionDepartment: string,
    productionLine: string,
}

const rowData = ref<Row[]>( [] );

const defaultColDef: ColDef = {
    editable: false,
    filter: true,
    sortable: true,
    resizable: true,
}

const columnDefs: ColDef[] = [
    { field: "workOrderIdno", headerName: '工令編號' },
    { field: "productIdno", headerName: '成品編號' },
    { field: "issueDate", headerName: '發料日期' },
    { field: "dueDate", headerName: '計劃完工日期' },
    { field: "quantity", headerName: '工令數量' },
    { field: "productionDepartment", headerName: '製造部門' },
    { field: "productionLine", headerName: '生產線別' },
]


const gridOptions = {
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
    onRowDoubleClicked: ( event: RowDoubleClickedEvent ) => { router.push( `/st_erp_work_orders/${ event.data.workOrderIdno }` ) },
}



onBeforeMount( async () => {
    let workOrderList: STWorkOrder[];
    try { workOrderList = await StErpService.getStWorkOrderList( { date: format( new Date(), 'yyyy-MM-dd' ) } ); }
    catch ( error ) {
        message.error( '資料抓取失敗' );
        return false;
    }
    for ( let workOrder of workOrderList ) {
        rowData.value.push( {
            workOrderIdno: workOrder.work_order_idno,
            productIdno: workOrder.product_idno,
            issueDate: new Date( workOrder.issue_date ).toLocaleDateString(),
            dueDate: new Date( workOrder.due_date ).toLocaleDateString(),
            quantity: workOrder.quantity,
            productionDepartment: workOrder.production_department,
            productionLine: workOrder.production_line,
        } );
    }
} );



function getRowId ( params: GetRowIdParams ) { return params.data.workOrderIdno; }



function onGridReady ( params: GridReadyEvent ) {
    gridApi.value = params.api;
    gridColumnApi.value = params.columnApi;
};



async function onClickCreateIssuanceButton ( event: Event ) {
    let stWorkOrder: Row;
    const materialList = [];

    // Get selected row
    const selectedRows: Row[] = gridApi.value.getSelectedRows();
    if ( selectedRows.length === 0 ) {
        message.warning( '請選擇舊 ERP 工單' );
        return false;
    } else { stWorkOrder = selectedRows[ 0 ]; }

    // Prepare a material list for latter checking
    materialList.push( stWorkOrder.productIdno );

    // Get selected work order's items
    const stWorkOrderItems = await StErpService.getStWorkOrderItems( { workOrderIdno: stWorkOrder.workOrderIdno } );
    for ( let item of stWorkOrderItems ) { materialList.push( item.material_idno ); }

    // Check if materials exist in WMS

    try { for ( let materialIdno of materialList ) { const Material = await MaterialsService.getMaterial( { idno: materialIdno } ); } }
    catch ( error ) {
        if ( error instanceof ApiError && error.status === 404 ) {
            message.error( '請先建立 WMS 物料主檔' );
            return false;
        }
    }
}
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
            <n-breadcrumb-item>物料管理</n-breadcrumb-item>
            <n-breadcrumb-item>舊 ERP 工單紀錄</n-breadcrumb-item>
        </n-breadcrumb>

        <div style="padding: 1rem;">
            <n-h1 prefix="bar" style="font-size: 1.4rem;">舊 ERP 工單紀錄</n-h1>
            <n-space vertical size="large"
                style="background-color: white; padding: 1rem; box-shadow: 0px 4px 20px -4px hsla(0, 0%, 60%, 0.4)">

                <n-space size="large" style="">
                    <!--
                    <n-tooltip>
                        <template #trigger>
                            <n-button type="primary" @click=" onClickCreateIssuanceButton( $event ) ">建立 WMS 發料單
                            </n-button>
                        </template>
                        建立 WMS 發料單前務必先建立 WMS 之「物料主檔」
                    </n-tooltip>
                    -->

                </n-space>

                <div style="height: 600px; overflow-x: scroll; width: 100%;">
                    <ag-grid-vue class="ag-theme-alpine" :rowData=" rowData " style="height: 100%;"
                        :gridOptions=" gridOptions " :getRowId=" getRowId " :onGridReady=" onGridReady "></ag-grid-vue>
                </div>

            </n-space>
        </div>
    </main>
</template>
    