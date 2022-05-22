<script>
import { AccountsService } from '../client';

export default {
    data () {
        return {}
    },
    created () { },
    mounted () { },
    unmounted () { },
    methods: {
        register () {
            console.log( import.meta.env.VITE_BACKEND_ORIGIN );
            console.log( AccountsService );
        },
    },
}
</script>

<template>
    <form v-on:submit.prevent=" register ">
        <input type="text">
        <input type="password">
        <button type="submit" @submit.prevent=" register ">註冊</button>
    </form>
</template>

<style scoped>
</style>
