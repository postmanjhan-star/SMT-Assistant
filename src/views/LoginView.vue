<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { NGrid, NGi, NCard, NForm, NFormItem, NInput, NButton } from 'naive-ui';
import { useMessage } from 'naive-ui';
import { FormInst, FormRules } from 'naive-ui';
import { SessionService, Body_login_for_access_token } from '../client';
import { useAuthStore } from '../stores/auth';

const message = useMessage();
const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const formRef = ref<FormInst | null>( null );
const formValue = ref<Body_login_for_access_token>( { username: null, password: null } );
const rules: FormRules = {
    username: {
        required: true,
        message: '请输入帳號',
        trigger: [ 'blur' ],
    },
    password: {
        required: true,
        message: '请输入密碼',
        trigger: [ 'input', 'blur' ],
    }
};

async function handleLoginButtonClick ( event: Event ) {
    formRef.value?.validate( async ( errors ) => {
        if ( !errors ) {
            login( formValue.value.username, formValue.value.password );
        } else {
            message.error( '請輸入帳號密碼' );
        }
    } );
}

async function login ( username: string, password: string ) {
    try {
        const response = await SessionService.loginForAccessToken( {
            username: username, password: password
        } );

        // Save token to auth store and local storage
        authStore.accountToken = JSON.stringify( response );
        // console.debug( auth.accountToken );

        // navigate to a protected resource
        router.push( '/home' );
    } catch ( errors ) {
        console.log( errors );
        message.error( '登入失敗' );
    }
}
</script>

<template>
    <n-grid cols="1 s:3" responsive="screen">
        <n-gi></n-gi>
        <n-gi>
            <n-card size="huge" hoverable>
                <!--<template #cover>
                    <img alt="Sentec logo" class="logo" src="http://www.sentecgroup.com/assets/img/logo.png"/>
                </template> -->
                <n-form size="large" @keyup.enter=" handleLoginButtonClick( $event ) " :model=" formValue "
                    :rules=" rules " ref="formRef">
                    <n-form-item show-require-mark autofocus label="帳號" path="username">
                        <n-input v-model:value.lazy=" formValue.username " autofocus
                            :input-props=" { autocomplete: 'username' } "></n-input>
                    </n-form-item>
                    <n-form-item show-require-mark label="密碼" path="password">
                        <n-input type="password" v-model:value.lazy=" formValue.password "
                            :input-props=" { autocomplete: 'current-password' } "></n-input>
                    </n-form-item>
                    <n-form-item>
                        <n-button type="primary" block @click=" handleLoginButtonClick( $event ) ">登入</n-button>
                    </n-form-item>
                </n-form>
            </n-card>
        </n-gi>
        <n-gi></n-gi>
    </n-grid>
</template>

<style scoped>
.n-grid {
    background: linear-gradient(180deg, hsla(0, 0%, 0%, 0.4), hsla(0, 0%, 0%, 0.4)), url(http://www.sentecgroup.com/assets/img/hero-bg.jpg);
    background: linear-gradient(180deg, hsla(210, 100%, 40%, 0.4), hsla(50, 100%, 50%, 0.4)), url(http://www.sentecgroup.com/assets/img/hero-bg.jpg);
    background-repeat: no-repeat;
    background-size: cover;
    background-position: center;
    min-height: 100vh;
}

.n-grid>div {
    padding-top: 2rem;
    padding-left: 1rem;
    padding-right: 1rem;
}

.n-card {
    background-color: hsla(0, 0%, 100%, 0.6);
    backdrop-filter: blur(8px);
}

.n-card-cover {
    padding: 20rem;
}
</style>
