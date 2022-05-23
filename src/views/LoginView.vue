<script>
import OpenAPI from '../openapi.js';
import { SessionService } from '../client';

export default {
    data () {
        return {
            username: null,
            password: null,
        }
    },
    created () { },
    mounted () { },
    unmounted () { },
    methods: {
        async login () {
            try {
                const res = await SessionService.loginForAccessToken( {
                    username: this.username,
                    password: this.password,
                } );
                console.log( res );
            } catch ( e ) {
                console.error( e )
            }
        },
    },
}
</script>

<template>
    <form v-on:submit.prevent=" login ">
        <label for="username">帳號</label>
        <input type="text" id="username" v-model=" username " autofocus>
        <label for="password">密碼</label>
        <input type="password" id="password" v-model=" password ">
        <button type="submit" @submit.prevent=" login ">登入</button>
    </form>
</template>

<style scoped>
</style>
