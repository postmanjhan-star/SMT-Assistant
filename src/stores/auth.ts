import { defineStore } from "pinia";

type State = {
    currentUser: Object | null;
};

type Getters = {
    isAuthenticated (): boolean;
};

type Actions = {
    loadUser (): void;
    clearUser (): void;
};

export const useAuthStore = defineStore<string, State, Getters, Actions>( {
    id: 'auth',
    state: () => ( {
        currentUser: null,
    } ),
    getters: {
        isAuthenticated () {
            return !!this.currentUser;
        }
    },
    actions: {
        loadUser () {
            this.currentUser = null;
        },
        clearUser () {
            this.currentUser = null;
        },
    },
} );
