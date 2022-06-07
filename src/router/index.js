import { createRouter, createWebHistory } from "vue-router";

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
    path: "/register",
    name: "Register",
    meta: { requiresAuth: true },
    component: () => import( "../views/RegisterView.vue" ),
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
        component: () => import( "../components/Accounts.vue" ),
      },
      {
        path: '/accounts/create',
        component: () => import( "../components/AccountsCreate.vue" ),
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
  const account = JSON.parse( localStorage.getItem( 'account' ) );
  // console.debug( 'Account:\n', JSON.stringify( account ) );

  const isAuthenticated = ( account ? true : false );
  // const isAuthenticated = true;
  // console.debug( 'isAuthenticated:\n', isAuthenticated );

  // const store = useStore();
  // const isAuthenticated = store.isAuthenticated;

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
} );

export default router;
