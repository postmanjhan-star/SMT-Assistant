import { defineStore, acceptHMRUpdate } from "pinia";
import { useStorage } from "@vueuse/core";
import { useAccountStore } from "./account";
import { SessionService } from "../client";

// useStore could be anything like useUser, useCart
// the first argument is a unique id of the store across your application
export const useAuthStore = defineStore( {
  id: 'auth',
  state: () => ( { accountToken: useStorage( 'account', '' ) } ),
  getters: { isAuthenticated () { return !!this.accountToken; } }, // Initial state shoule be 'false'
  actions: {
    async refreshToken () {
      const response = await SessionService.refreshTokens(); // Handle error on caller, not here.
      this.accountToken = JSON.stringify( response );
    },
    async logout () {
      const accountStore = useAccountStore();
      accountStore.authorizedModules = [];
      await SessionService.logout();
      this.accountToken = null;
      localStorage.clear();
    },
  },
} );

// make sure to pass the right store definition, `useAuthStore` in this case.
if ( import.meta.hot ) {
  import.meta.hot.accept( acceptHMRUpdate( useAuthStore, import.meta.hot ) )
}
