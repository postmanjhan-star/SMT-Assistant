<script setup lang="ts">
import { GridOptions, RowDoubleClickedEvent } from "ag-grid-community"
import "ag-grid-community/styles/ag-grid.css" // Core grid CSS, always needed
import "ag-grid-community/styles/ag-theme-alpine.css" // Optional theme CSS
import { AgGridVue } from "ag-grid-vue3" // the AG Grid Vue Component
import { format, fromUnixTime, getTime } from 'date-fns'
import { NA, NBreadcrumb, NBreadcrumbItem, NButton, NDatePicker, NForm, NFormItemGi, NGrid, NH1, NSpace, useMessage } from 'naive-ui'
import { onBeforeMount, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { MaterialTypeEnum, OpenAPI, StErpService, STPart, STWorkOrder } from '../../client'
import { useAuthStore } from '../../stores/auth'

const message = useMessage()
const router = useRouter()
const authStore = useAuthStore()
OpenAPI.TOKEN = JSON.parse( authStore.accountToken )[ 'access_token' ]

const dateForm = ref( { dateTimestamp: getTime( new Date() ) } );

type Row = {
    workOrderIdno: string,
    productIdno: string,
    productType: MaterialTypeEnum,
    productName: string,
    issueDate: string,
    dueDate: string,
    quantity: number,
    productionDepartment: string,
    productionLine: string,
}

const rowData = ref<Row[]>( [] );
const gridOptions: GridOptions = {
    // PROPERTIES
    // Column Definitions
    columnDefs: [
        { field: "workOrderIdno", headerName: '工令編號' },
        { field: "productIdno", headerName: '製品物料代碼' },
        { field: "productType", headerName: '類別', refData: { RAW_MATERIAL: '❹ 原料', PRODUCT: '❶ 成品', IN_PROCESS_MATERIAL: '❷ 半成品' } },
        { field: "productName", headerName: '名稱' },
        { field: "issueDate", headerName: '發料日期' },
        { field: "dueDate", headerName: '計劃完工日期' },
        { field: "quantity", headerName: '工令數量' },
        { field: "productionDepartment", headerName: '製造部門' },
        { field: "productionLine", headerName: '生產線別' },
    ],
    defaultColDef: { editable: false, filter: true, sortable: true, resizable: true },

    // Editing
    stopEditingWhenCellsLoseFocus: true,
    enterMovesDownAfterEdit: true,
    undoRedoCellEditing: true,

    // Miscellaneous
    debug: false,

    // Pagination
    pagination: true,

    // Rendering
    suppressColumnVirtualisation: true,

    // Row Pinning

    // RowModel

    // Scrolling
    debounceVerticalScrollbar: false,
    
    // Selection
    rowSelection: 'single',
    enableCellTextSelection: true,
    suppressCellFocus: true,

    // Styling
    suppressRowTransform: true,

    // EVENTS
    // Miscellaneous
    onViewportChanged: ( event ) => { event.columnApi.autoSizeAllColumns() },

    // RowModel: Client-Side
    onRowDataUpdated: ( event ) => { event.columnApi.autoSizeAllColumns() },

    // Selection
    onRowDoubleClicked: ( event: RowDoubleClickedEvent ) => { router.push( `/wms/st_erp_work_orders/${ event.data.workOrderIdno }` ) },
}

function setRowData ( { workOrder, productType, stProductPart }: { workOrder: STWorkOrder, productType: MaterialTypeEnum, stProductPart: STPart } ) {
    rowData.value.push( {
        workOrderIdno: workOrder.work_order_idno,
        productIdno: workOrder.product_idno,
        productType: productType,
        productName: stProductPart.spec_1,
        issueDate: new Date( workOrder.issue_date ).toLocaleDateString(),
        dueDate: new Date( workOrder.due_date ).toLocaleDateString(),
        quantity: workOrder.quantity,
        productionDepartment: workOrder.production_department,
        productionLine: workOrder.production_line,
    } );
    gridOptions.api.setRowData( rowData.value )
}

async function queryWorkOrders ( date: Date ) {
    let workOrderList: STWorkOrder[];
    try { workOrderList = await StErpService.getStWorkOrderList( { date: format( date, 'yyyy-MM-dd' ) } ); }
    catch ( error ) {
        message.warning( '無資料' );
        return false;
    }
    rowData.value = [];
    for ( let workOrder of workOrderList ) {
        const stProductPart = await StErpService.getStPart( { partIdno: workOrder.product_idno } );
        let productType: MaterialTypeEnum;
        switch ( stProductPart.part_type ) {
            case 4:
                productType = MaterialTypeEnum.RAW_MATERIAL;
                setRowData( { workOrder: workOrder, productType: productType, stProductPart: stProductPart } )
                break;
            case 2:
                productType = MaterialTypeEnum.IN_PROCESS_MATERIAL;
                setRowData( { workOrder: workOrder, productType: productType, stProductPart: stProductPart } )
                break;
            case 1:
                productType = MaterialTypeEnum.PRODUCT;
                setRowData( { workOrder: workOrder, productType: productType, stProductPart: stProductPart } )
                break;
        }
    }
}


onBeforeMount( async () => { await queryWorkOrders( new Date() ); } );


async function onSubmitDateQuery ( event: Event ) {
    const dateTime = fromUnixTime( dateForm.value.dateTimestamp / 1000 );
    await queryWorkOrders( dateTime );
}
</script>
    
    
<template>
    <main
        style="min-height: calc(100vh - 60px); background-color: hsla(0, 0%, 92%, 1.0); background-image: url('/pattern.svg'); background-repeat: repeat-x; background-position: center; background-size: cover;">
        <n-breadcrumb
            style="padding: 1rem; box-shadow: 0px 4px 20px -4px hsla(0, 0%, 60%, 0.4); position: relative; background-color: white; z-index: 1; overflow: auto;">
            <n-breadcrumb-item>
                <router-link to="/wms/home" #=" { navigate, href } " custom>
                    <n-a :href=" href " @click=" navigate ">首頁</n-a>
                </router-link>
            </n-breadcrumb-item>
            <n-breadcrumb-item>收發作業</n-breadcrumb-item>
            <n-breadcrumb-item>舊 ERP 工單紀錄</n-breadcrumb-item>
        </n-breadcrumb>

        <div style="padding: 1rem;">
            <n-h1 prefix="bar" style="font-size: 1.4rem;">舊 ERP 工單紀錄</n-h1>
            <n-space vertical size="large"
                style="background-color: white; padding: 1rem; box-shadow: 0px 4px 20px -4px hsla(0, 0%, 60%, 0.4)">

                <n-form size="large" :model=" dateForm ">
                    <n-grid cols="1 s:3">
                        <n-form-item-gi label="日期">
                            <n-space>
                                <n-date-picker v-model:value.lazy=" dateForm.dateTimestamp " type="date" />
                                <n-button type="primary" @click=" onSubmitDateQuery( $event ) " attr-type="submit">查詢
                                </n-button>
                            </n-space>
                        </n-form-item-gi>
                    </n-grid>
                </n-form>

                <div style="height: 600px; overflow-x: scroll; width: 100%;">
                    <ag-grid-vue class="ag-theme-alpine" :rowData=" rowData " style="height: 100%;"
                        :gridOptions=" gridOptions "></ag-grid-vue>
                </div>

            </n-space>
        </div>
    </main>
</template>
    