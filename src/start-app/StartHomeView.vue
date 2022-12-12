<script setup lang="ts">
import fujiMounterAssistantIconUrl from '@/assets/fuji2.webp';
import panasonicMounterAssistantIconUrl from '@/assets/panasonic.webp';
import wmsIconUrl from '@/assets/wms.webp';
import { NA, NCard, NGi, NGrid, NImage, NSpace, useMessage } from 'naive-ui';
import { onMounted } from 'vue';
import { RouterLink } from 'vue-router';

const props = defineProps( { message: String } );
const message = useMessage();

onMounted( () => { if ( props.message ) message.warning( props.message ); } )
</script>



<template>
    <n-grid cols="1 s:4" responsive="screen">
        <n-gi span="0 s:1"></n-gi>
        <n-gi span="2 s:2">

            <n-card size="huge" hoverable style="margin-top: 1rem;">
                <n-space justify="center" size="large">
                    <router-link to="/wms/home" #=" { navigate, href } " custom>
                        <n-a :href=" href " @click=" navigate ">
                            <n-image class="app-icon" :src=" wmsIconUrl " width="80" preview-disabled lazy
                                alt="Fuji 打件機上料助手"></n-image><br>
                            WMS
                        </n-a>
                    </router-link>

                    <router-link to="/smt/fuji-mounter" #=" { navigate, href } " custom>
                        <n-a :href=" href " @click=" navigate ">
                            <n-image class="app-icon" :src=" fujiMounterAssistantIconUrl " width="80" preview-disabled
                                lazy alt="Fuji 打件機上料助手"></n-image><br>
                            富士打件機<br />上料助手
                        </n-a>
                    </router-link>

                    <router-link to="/smt/panasonic-mounter" #=" { navigate, href } " custom>
                        <n-a :href=" href " @click=" navigate ">
                            <n-image class="app-icon" :src=" panasonicMounterAssistantIconUrl " width="80"
                                preview-disabled lazy alt="Panasonic 打件機上料助手"></n-image><br>
                            松下打件機<br />上料助手
                        </n-a>
                    </router-link>
                </n-space>
            </n-card>

        </n-gi>
        <n-gi span="0 s:1"></n-gi>
    </n-grid>
</template>

<style scoped>
.n-grid {
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
    backdrop-filter: unset;
    -webkit-backdrop-filter: blur(20px);
}

.n-card-cover {
    padding: 20rem;
}

.n-a {
    font-size: smaller;
    text-decoration: none;
    display: inline-block;
    border-radius: 24px;
    text-align: center;
    color: var(--n-title-text-color);
}

.app-icon {
    border-radius: 20px;
    /* border: 0.1px solid hsla(0, 0%, 0%, 0.2); */
    box-shadow: 0px 4px 20px -16px hsl(0, 0%, 0%);
    transition: transform 0.2s;
    will-change: transform;
}

.app-icon:hover {
    will-change: transform;
    transform: scale(1.06);
    transition: transform 0.2s;
}
</style>
