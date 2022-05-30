<script>
import { AccountsService } from '../client';

export default {
    data () {
        return {
            username: null,
            password: null,
        }
    },
    methods: {
        async register () {
            try {
                const resp = await AccountsService.createAccount( {
                    username: this.username,
                    password: this.password,
                } )
                console.log( resp );
            } catch ( e ) {
                console.error( e );
            }
        },
    },
}
</script>

<template>
    <form v-on:submit.prevent=" register ">
        <label for="username">帳號</label>
        <input type="text" id="username" v-model=" username " autofocus required aria-required="true">
        <label for="password">密碼</label>
        <input type="password" id="password" v-model=" password " required aria-required="true">
        <button type="submit" @submit.prevent=" register ">註冊</button>
    </form>
</template>

<style scoped>
</style>
