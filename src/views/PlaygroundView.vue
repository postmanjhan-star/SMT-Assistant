<script setup>
import { useAuthStore } from '../stores/auth';
import backgroundImageUrl from '../assets/shapes-6393929_1920.jpg'

const auth = useAuthStore();
console.debug( auth.accountToken );

function handleInitializeButtonClick () {
    auth.accountToken = 1;
    console.debug( auth.accountToken );
}

function handleAddButtonClick () {
    auth.accountToken++;
    console.debug( auth.accountToken );
}

function handleResetButtonClick () {
    auth.accountToken = null;
    console.debug( auth.accountToken );
}
</script>

<template>
    <main :style=" { backgroundImage: `url(${ backgroundImageUrl })` } "
        style="padding: 1rem; background-repeat: no-repeat; background-attachment: fixed; background-size: cover; background-position: center; ">
        <!-- <n-drawer v-model:show=" show " placement="left" :close-on-esc=" true " :show-mask=" false ">
            <n-drawer-content title="斯通纳" closable>
                《斯通纳》是美国作家约翰·威廉姆斯在 1965 年出版的小说。
            </n-drawer-content>
        </n-drawer> -->

        <button @click=" handleInitializeButtonClick ">Initialize</button>
        <button @click=" handleAddButtonClick ">++</button>
        <button @click=" handleResetButtonClick ">Reset</button>
        <p>content</p>
        <p>content</p>
        <p>content</p>
        <p>content</p>
        <p>content</p>
        <p>content</p>
    </main>

</template>

<style scoped>
</style>
