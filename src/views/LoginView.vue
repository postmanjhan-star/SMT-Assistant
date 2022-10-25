<script setup lang="ts">
import { FormInst, FormRules, NA, NButton, NCard, NForm, NFormItem, NGi, NGrid, NInput, useMessage } from 'naive-ui';
import { onMounted, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { Body_login_for_access_token, SessionService } from '../client';
import { useAccountStore } from '../stores/account';
import { useAuthStore } from '../stores/auth';

const props = defineProps( { message: String } );
const message = useMessage();

const router = useRouter();

const authStore = useAuthStore();
const accountStore = useAccountStore();

const formRef = ref<FormInst | null>( null );
const formValue = ref<Body_login_for_access_token>( { username: '', password: '' } );
const rules: FormRules = {
    username: { required: true, message: '請輸入帳號', trigger: [ 'blur' ], },
    password: { required: true, message: '請輸入密碼', trigger: [ 'input', 'blur' ], }
};



onMounted( () => { if ( props.message ) message.warning( props.message ); } );



async function login ( username: string, password: string ) {
    try {
        const response = await SessionService.loginForAccessToken( { formData: { username: username, password: password } } );

        // Save token to auth store and local storage
        authStore.accountToken = JSON.stringify( response );
    } catch ( error ) { message.error( '登入失敗' ); }
}



async function getAccountInformation () { await accountStore.setAuthorizedModules(); }



function redirectToHome () { router.push( '/home' ); }



async function onClickLoginButton ( event: Event ) {
    formRef.value?.validate( async ( errors ) => {
        if ( !errors ) {
            // Login and get token
            await login( formValue.value.username, formValue.value.password );

            // Use token to get account information, authorized modules, etc...
            await getAccountInformation();

            // Navigate to a protected resource
            redirectToHome();
        } else { message.error( '請輸入帳號密碼' ); }
    } );
}
</script>



<template>
    <n-grid cols="1 s:4" responsive="screen">
        <n-gi span="0 s:1"></n-gi>
        <n-gi span="2 s:2">
            <n-card size="huge" hoverable>
                <!--<template #cover>
                    <img alt="Sentec logo" class="logo" src="http://www.sentecgroup.com/assets/img/logo.png"/>
                </template> -->
                <n-form size="large" @keyup.enter=" onClickLoginButton( $event ) " :model=" formValue " :rules=" rules "
                    ref="formRef">
                    <n-form-item show-require-mark label="帳號" path="username">
                        <n-input v-model:value.lazy=" formValue.username " autofocus
                            :input-props=" { autocomplete: 'username' } "></n-input>
                    </n-form-item>
                    <n-form-item show-require-mark label="密碼" path="password">
                        <n-input type="password" v-model:value.lazy=" formValue.password "
                            :input-props=" { autocomplete: 'current-password' } "></n-input>
                    </n-form-item>
                    <n-form-item>
                        <n-button type="primary" block @click=" onClickLoginButton( $event ) ">登入</n-button>
                    </n-form-item>
                </n-form>
            </n-card>

            <div style="text-align: center; margin-top: 1rem;">
                <router-link to="/smt/mounter" #=" { navigate, href } " custom>
                    <n-a :href=" href " @click=" navigate ">SMT Mounter 上料助手</n-a>
                </router-link>
            </div>
        </n-gi>
        <n-gi span="0 s:1"></n-gi>
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
