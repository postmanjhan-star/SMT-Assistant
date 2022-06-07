<script setup>
import { onBeforeMount } from "vue";
import { useAccountStore } from "../stores/account";

const accountStore = useAccountStore();

accountStore.authorizedModules = 'A';
console.debug( '1:\n', accountStore.authorizedModules );

onBeforeMount( async () => {
    await accountStore.setAuthorizedModules();
    console.debug( '2:\n', accountStore.authorizedModules );
} );

accountStore.authorizedModules = 'C';
console.debug( '3:\n', accountStore.authorizedModules );
</script>

<template>
    <main>
        <div v-if=" accountStore.authorizedModules.includes( 'see_good_group' ) ">
            D {{ accountStore.authorizedModules }} {{ typeof accountStore.authorizedModules }}
        </div>
        <div v-if=" accountStore.authorizedModules === 'A' ">
            A {{ accountStore.authorizedModules }}
        </div>
        <div v-if=" accountStore.authorizedModules === 'B' ">
            B {{ accountStore.authorizedModules }}
        </div>
    </main>
</template>
