import { createApp } from "vue"
import { createMetaManager } from 'vue-meta'
import App from "./App.vue"
import router from "./router/index"

const app = createApp(App)

app.use(router)
app.use(createMetaManager())

app.mount("#app")

// 现在，应用已经启动了！
