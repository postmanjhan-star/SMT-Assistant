import { ref } from "vue";
import { defineStore } from "pinia";
import { MeService } from "@/client";

const useAccountStore = defineStore( 'account', () => {
    const authorizedModules = ref<any>( [] );
    async function setAuthorizedModules () {
        try {
            const response = await MeService.getAuthorizedModules();
            authorizedModules.value = response;
        } catch ( error ) { console.error( error ); }
    }
    return { authorizedModules, setAuthorizedModules };
} );

export { useAccountStore };
