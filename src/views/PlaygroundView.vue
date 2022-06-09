<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

// undefined 物件可能為「未定義」。
const a = route.params;

// any 找不到名稱 '$route'。
// const a = $route.params;

// const a = 'a';
console.debug( a );
</script>

<template>
    <main>
        <div>
            {{ $route.params }}
        </div>
    </main>
</template>
