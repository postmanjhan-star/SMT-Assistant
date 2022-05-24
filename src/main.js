import { createApp } from "vue";
import { createPinia } from "pinia";

import App from "./App.vue";
import router from "./router";

// 创建并挂载根实例
const app = createApp(App);

app.use(createPinia());

//确保 _use_ 路由实例使
//整个应用支持路由。
app.use(router);

app.mount("#app");

// 现在，应用已经启动了！
