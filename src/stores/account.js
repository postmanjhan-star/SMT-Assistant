import { ref } from "vue";
import { defineStore } from "pinia";
import { useStorage } from "@vueuse/core";
import { useAuthStore } from "./auth";
import { OpenAPI, MeService } from "../client";

const useAccountStore = defineStore( 'account', () => {
    const authorizedModules = ref( useStorage( 'authorizedModules', [] ) );
    async function setAuthorizedModules () {
        const authStore = useAuthStore();
        OpenAPI.TOKEN = JSON.parse( authStore.accountToken )[ 'access_token' ];
        try {
            const response = await MeService.getAuthorizedModules();
            authorizedModules.value = response;
        } catch ( error ) { console.error( error ); }
    }
    return { authorizedModules, setAuthorizedModules };
} );

export { useAccountStore };
