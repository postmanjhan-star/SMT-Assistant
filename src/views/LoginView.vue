<script>
export default {
    data () {
        return {}
    },
    created () { },
    mounted () { },
    unmounted () { },
    methods: {
        login () {
            console.log( this );
        },
    },
}
</script>

<template>
    <form v-on:submit.prevent=" login ">
        <input type="tel">
        <input type="password">
        <button type="submit" @submit.prevent=" login ">登入</button>
    </form>
</template>

<style scoped>
</style>
