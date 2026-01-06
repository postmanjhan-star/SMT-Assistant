
import { createApp } from "vue"
import { createPinia } from "pinia"

import { piniaLocalStoragePlugin } from "./plugins/piniaLocalStorage"
import { createMetaManager } from 'vue-meta'
import App from "./App.vue"
import router from "./router/index"
import { OpenAPI } from "./client"
import { useAuthStore } from "./stores/authStore"


const app = createApp(App)
const pinia = createPinia()

pinia.use(piniaLocalStoragePlugin)

app.use(pinia)
app.use(router)
app.use(createMetaManager())

// 設定 OpenAPI 全域 Token
// 這樣每次呼叫 API 時，都會動態從 authStore 取得最新的 accessToken
OpenAPI.TOKEN = async () => {
    const authStore = useAuthStore()
    return authStore.accessToken || ''
}

app.mount("#app")

// 现在，应用已经启动了！
