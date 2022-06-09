import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { useAccountStore } from "../stores/account";

// 2. 定义一些路由
// 每个路由都需要映射到一个组件。
// 这些都会传递给 `createRouter`
const routes = [
  {
    path: "/",
    name: "Login",
    meta: { requiresAuth: false },
    component: () => import( "../views/LoginView.vue" ),
  },
  {
    path: "/home",
    name: "Home",
    meta: { requiresAuth: true },
    component: () => import( "../views/HomeView.vue" ),
    children: [
      {
        path: '',
        component: () => import( "../components/HomeMain.vue" ),
      },
      {
        path: '/accounts',
        meta: { requiredAuthModule: [ 'see_system_group' ] },
        component: () => import( "../components/Accounts.vue" ),
      },
      {
        path: '/accounts/create',
        meta: { requiredAuthModule: [ 'see_system_group' ] },
        component: () => import( "../components/AccountsCreate.vue" ),
      },
      {
        path: '/accounts/:idno',
        meta: { requiredAuthModule: [ 'see_system_group' ] },
        component: () => import( "../components/AccountsItem.vue" ),
      },
    ],
  },
  {
    path: "/playground",
    name: "Playground",
    meta: { requiresAuth: false },
    component: () => import( "../views/PlaygroundView.vue" ),
  },
  {
    path: "/403",
    name: "Forbidden",
    meta: { requiresAuth: false },
    component: () => import( "../views/ForbiddenView.vue" ),
  },
  {
    path: "/404",
    name: "NotFound",
    meta: { requiresAuth: false },
    component: () => import( "../views/NotFoundView.vue" ),
  },
  {
    path: "/:pathMatch(.*)",
    name: "NotFound",
    meta: { requiresAuth: false },
    component: () => import( "../views/NotFoundView.vue" ),
  },
]

// 3. 创建路由实例并传递 `routes` 配置
// 你可以在这里输入更多的配置，但我们在这里
// 暂时保持简单

const router = createRouter( {
  // 4. 内部提供了 history 模式的实现。
  history: createWebHistory(),
  routes: routes,
} );


router.beforeEach( async ( to, from ) => {
  const authStore = useAuthStore();
  const accountStore = useAccountStore();

  const account = JSON.parse( authStore.accountToken );
  // console.debug( 'Account:\n', JSON.stringify( account ) );

  const isAuthenticated = ( account ? true : false );
  // console.debug( 'isAuthenticated:\n', isAuthenticated );

  if (
    to.meta.requiresAuth &&
    // 检查用户是否已登录
    !isAuthenticated &&
    // ❗️ 避免无限重定向
    to.name !== 'Login'
  ) {
    // 将用户重定向到登录页面
    return { name: 'Login' };
  }

  if (
    to.meta.requiredAuthModule &&
    to.meta.requiredAuthModule.includes( 'see_system_group' ) &&
    !accountStore.authorizedModules.includes( 'see_system_group' )
  ) {
    return { path: '/403' }
  }
} );

export default router;
