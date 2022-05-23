<script>
import { NForm, NFormItem, NInput, NButton } from 'naive-ui';
import { zhTW, dateZhTW } from 'naive-ui';
import OpenAPI from '../openapi.js';
import { SessionService } from '../client';

export default {
    components: {
        NForm,
        NFormItem,
        NInput,
        NButton,
    },
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

    <n-form>
        <n-form-item label="帳號">
            <n-input></n-input>
        </n-form-item>
        <n-form-item label="密碼">
            <n-input type="password"></n-input>
        </n-form-item>
        <n-form-item>
            <n-button @click=" login ">登入</n-button>
        </n-form-item>
    </n-form>


</template>

<style scoped>
</style>
