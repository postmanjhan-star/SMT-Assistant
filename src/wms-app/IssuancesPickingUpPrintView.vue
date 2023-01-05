<script setup lang="ts">
import { dateZhTW, GlobalThemeOverrides, NConfigProvider, NTag, zhTW } from 'naive-ui'
import { onMounted, ref } from "vue"
import { useMeta } from 'vue-meta'
import { useRoute, useRouter } from "vue-router"
import { ApiError, IssuanceItemRead, IssuanceRead, IssuancesService, OpenAPI } from "../client"
import { useAuthStore } from '../stores/auth'


const authStore = useAuthStore();
OpenAPI.TOKEN = JSON.parse( authStore.accountToken )[ 'access_token' ];

const router = useRouter();
const route = useRoute();

const lightThemeBorderColor = 'rgba(214, 214, 214, 1.0)'; // hsla(0, 0%, 84%, 1.0)
const lightThemeRailColor = 'rgba(153, 153, 153. 1.0)'; // hsla(0, 0%, 60%, 1.0)
const lightThemeInputColor = 'rgba(245, 245, 245, 1.0)'; // hsla(0, 0%, 96%, 1.0)

/**
 * js 文件下使用这个做类型提示
 * @type import('naive-ui').GlobalThemeOverrides
 */
const lightThemeOverrides: GlobalThemeOverrides = {
    common: {
        fontWeightStrong: "600",
        dividerColor: lightThemeBorderColor,
        inputColor: lightThemeInputColor,
    },
    DataTable: {
        borderColor: lightThemeBorderColor,
    },
    Switch: {
        railColor: lightThemeRailColor,
    },
}

const issuance = ref<IssuanceRead>( {
    id: 0,
    created_at: '',
    updated_at: '',
    idno: '',
    date: '',
    employee_id: 0,
    memo: '',
    issuing_completed: false,
} )

type Picking = IssuanceItemRead & {}

const pickings = ref<Picking[]>( [] )

useMeta( { title: `發料備料單 ${ issuance.value.idno }` } ) // Reactive does not work here. Minor.

onMounted( async () => {
    try { issuance.value = await IssuancesService.getIssuance( { issuanceIdno: route.params.idno.toString() } ); }
    catch ( error ) { if ( error instanceof ApiError && error.status === 404 ) { router.push( '/http-status/404' ); } }

    for ( let issuanceItem of issuance.value.issuance_items as IssuanceItemRead[] ) { pickings.value.push( issuanceItem ) }
} );
</script>



<template>
    <n-config-provider :locale=" zhTW " :date-locale=" dateZhTW " inline-theme-disabled
        :theme-overrides=" lightThemeOverrides ">

        <main>
            <table>
                <!-- `thead` repeats on every printed page -->
                <thead>
                    <tr>
                        <th colspan="6">
                            <h1 style="vertical-align: middle;">
                                <span>發料備料單 {{ issuance.idno }}</span>
                                <n-tag size="large" strong v-if=" issuance?.issuing_completed " style="float: right;">
                                    已發料
                                </n-tag>
                            </h1>
                            <aside>
                                <p>Memo</p>
                                <p>{{ issuance.memo }}</p>
                            </aside>
                            <!-- <vue-barcode value="5901234123457" :options=" { format: 'EAN13' } "></vue-barcode> -->
                        </th>
                    </tr>
                    <tr>
                        <th class="row-index">項次</th>
                        <th></th>
                        <th>單包代碼</th>
                        <th>物料</th>
                        <th></th>
                        <th>倉儲位</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(   item, index   ) in pickings">
                        <td class="row-index">{{ index + 1 }}</td>
                        <td>
                            <n-tag size="large" strong v-if=" item?.picked ">已備料</n-tag>
                        </td>
                        <td class="inventory-idno"> {{ item.material_inventory_idno }}</td>
                        <td class="material-idno">{{ item.material_idno }}</td>
                        <td class="material-information">
                            <div>{{ item.material_name }}</div>
                            <div>{{ item.material_description }}</div>
                        </td>
                        <td><span v-if=" !item?.picked ">{{ item.l1_storage_idno }} / {{ item.l2_storage_idno }}</span>
                        </td>
                    </tr>
                </tbody>
            </table>
        </main>

    </n-config-provider>
</template>



<style>
@page {
    size: 210mm 297mm;
    margin: 40px;
}

@media print {

    html,
    body {
        outline-width: 0px !important;
        background-color: white !important;
        box-shadow: none !important;
        padding: unset !important;
    }
}

html {
    /* outline: 2px solid blue; */
    font-size: 12px;
    font-family: sans-serif;

    /* Disable on printing */
    background-color: hsla(0, 0%, 88%, 1.0);
}

body {
    /* Disable on printing */
    padding: 20px;

    font-size: 12px;
    width: 210mm;
    margin: 0 auto 0 auto;
    /* outline: 2px solid red; */
    font-family: sans-serif;
    color: hsla(0, 0%, 20%, 1.0);
    background-color: white;

    /* Disable on printing */
    box-shadow: 0px 4px 20px -4px hsla(0, 0%, 80%, 0.4);
}

p {
    line-height: 100%;
}

h1 {
    margin-top: 0;
    margin-bottom: 1rem;
    font-weight: normal;
    font-size: 200%;
    line-height: 100%;
}


aside {
    padding-block: 0.01rem;
    padding-inline: 1rem;
    background-color: hsla(0, 0%, 84%, 1.0);
    margin-block-end: 1rem;
}

table {
    width: 100%;
    border-collapse: collapse;
}

tbody>tr:nth-child(odd) {
    background-color: hsla(0, 0%, 94%, 1.0);
}

th {
    padding: 0;
    text-align: left;
    border-bottom: 1px solid hsla(0, 0%, 20%, 1.0);
}

td {
    padding: 0;
    border-bottom: 1px solid hsla(0, 0%, 80%, 1.0);
}

.row-index {
    /* width: 4rem; */
    font-variant-numeric: tabular-nums;
    text-align: center;
}

.inventory-idno {
    /* width: 15rem; */
    font-weight: bold;
    font-size: 120%;
}

.material-idno {
    font-size: 120%;
    font-weight: bold;
    font-variant-numeric: slashed-zero;
}

.material-information {
    /* width: 40%; */
    font-size: 100%;
}
</style>
