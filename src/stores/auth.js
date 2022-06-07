import { defineStore, acceptHMRUpdate } from "pinia";
import { useStorage } from "@vueuse/core";

// useStore could be anything like useUser, useCart
// the first argument is a unique id of the store across your application
export const useAuthStore = defineStore( {
    id: 'auth',
    state: () => ( {
        accountToken: useStorage('account', null),
    } ),
    // getters: {
    //     isAuthenticated () {
    //         return !!this.currentAccount;
    //     }
    // },
    // actions: {
    //     loadAccount () {
    //         this.currentAccount = null;
    //     },
    //     clearAccount () {
    //         this.currentAccount = null;
    //     },
    // },
} );

// make sure to pass the right store definition, `useAuthStore` in this case.
if ( import.meta.hot ) {
    import.meta.hot.accept( acceptHMRUpdate( useAuthStore, import.meta.hot ) )
}
