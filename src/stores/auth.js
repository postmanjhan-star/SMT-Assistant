import { defineStore, acceptHMRUpdate } from "pinia";

export const useAuthStore = defineStore( {
    id: 'auth',
    state: () => ( {
        currentAccount: null,
    } ),
    getters: {
        isAuthenticated () {
            return !!this.currentAccount;
        }
    },
    actions: {
        loadAccount () {
            this.currentAccount = null;
        },
        clearAccount () {
            this.currentAccount = null;
        },
    },
} );

// make sure to pass the right store definition, `useAuthStore` in this case.
if ( import.meta.hot ) {
    import.meta.hot.accept( acceptHMRUpdate( useAuthStore, import.meta.hot ) )
}
