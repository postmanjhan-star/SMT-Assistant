import { createRouter, createWebHistory } from "vue-router";

// 1. 定义路由组件.
// 也可以从其他文件导入
import HomeView from "../views/HomeView.vue";

// 2. 定义一些路由
// 每个路由都需要映射到一个组件。
// 这些都会传递给 `createRouter`
const routes = [
  {
    path: "/",
    name: "Login",
    component: () => import( "../views/LoginView.vue" ),
  },
  {
    path: "/register",
    name: "Register",
    component: () => import( "../views/RegisterView.vue" ),
  },
  {
    path: "/home",
    name: "Home",
    component: HomeView,
  },
  {
    path: "/:pathMatch(.*)*",
    name: "NotFound",
    // route level code-splitting
    // this generates a separate chunk (About.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import( "../views/NotFoundView.vue" ),
  },
]

// 3. 创建路由实例并传递 `routes` 配置
// 你可以在这里输入更多的配置，但我们在这里
// 暂时保持简单
const router = createRouter( {
  // 4. 内部提供了 history 模式的实现。
  history: createWebHistory( import.meta.env.BASE_URL ),
  routes: routes,
} );

export default router;
