
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

// 攔截全域 401，強制彈出重新登入 Modal
// request.ts 使用原生 fetch，在此包裝以偵測 token 過期
const _originalFetch = window.fetch
window.fetch = async (...args) => {
    const response = await _originalFetch(...args)
    if (response.status === 401) {
        const authStore = useAuthStore()
        authStore.markNeedsReauth()
    }
    return response
}

app.mount("#app")

// 现在，应用已经启动了！
