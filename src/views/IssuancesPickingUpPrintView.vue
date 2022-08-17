<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ApiError, IssuanceItemRead, IssuanceRead, IssuancesService, OpenAPI } from "../client";
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
OpenAPI.TOKEN = JSON.parse( authStore.accountToken )[ 'access_token' ];

const router = useRouter();
const route = useRoute();

const issuance = ref<IssuanceRead>( {
    id: 0,
    idno: '',
    date: '',
    employee_id: 0,
    memo: '',
} );

type Picking = IssuanceItemRead & {}

const pickings = ref<Picking[]>( [] );

onMounted( async () => {
    try { issuance.value = await IssuancesService.getIssuance( route.params.idno.toString() ); }
    catch ( error ) { if ( error instanceof ApiError && error.status === 404 ) { router.push( '/404' ); } }

    for ( let issuanceItem of issuance.value.issuance_items as IssuanceItemRead[] ) { pickings.value.push( issuanceItem ) }
} );
</script>


<template>
    <main>
        <table>
            <!-- `thead` repeats on every printed page -->
            <thead>
                <tr>
                    <th colspan="5">
                        <h1>發料備料單 {{ issuance.idno }}</h1>
                        <!-- <vue-barcode value="5901234123457" :options=" { format: 'EAN13' } "></vue-barcode> -->
                    </th>
                </tr>
                <tr>
                    <th class="row-index">項次</th>
                    <th>單包代碼</th>
                    <th>物料</th>
                    <th></th>
                    <th>倉儲位</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="( item, index ) in pickings">
                    <td class="row-index">{{ index + 1 }}</td>
                    <td class="inventory-idno">{{ item.material_inventory_idno }}</td>
                    <td class="material-idno">{{ item.material_idno }}</td>
                    <td class="material-information">
                        <div>{{ item.material_name }}</div>
                        <div>{{ item.material_description }}</div>
                    </td>
                    <td>{{ item.l1_storage_idno }} / {{ item.l2_storage_idno }}
                    </td>
                </tr>
            </tbody>
        </table>
    </main>
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
    background-color: hsla(0, 0%, 88%, 1.0); /* Disable on printing */
}

body {
    padding: 20px; /* Disable on printing */
    font-size: 12px;
    width: 210mm;
    margin: 0 auto 0 auto;
    /* outline: 2px solid red; */
    font-family: sans-serif;
    color: hsla(0, 0%, 20%, 1.0);
    background-color: white;
    box-shadow: 0px 4px 20px -4px hsla(0, 0%, 80%, 0.4); /* Disable on printing */
}

h1 {
    margin-top: 0;
    margin-bottom: 0;
    font-weight: normal;
    font-size: 200%;
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
