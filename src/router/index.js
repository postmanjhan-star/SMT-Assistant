import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { useAccountStore } from "../stores/account";
import { ApiError } from "../client";

// 2. 定义一些路由
// 每个路由都需要映射到一个组件。
// 这些都会传递给 `createRouter`
const routes = [
  {
    path: "/",
    name: "Login",
    meta: { requiresAuth: false },
    component: () => import( "../views/LoginView.vue" ),
    props: true,
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
      {
        path: '/storages',
        component: () => import( "../components/StoragesMain.vue" ),
      },
      {
        path: '/storages/create',
        component: () => import( "../components/StoragesCreate.vue" ),
      },
      {
        path: '/storages/:idno',
        component: () => import( "../components/StoragesItem.vue" ),
      },
      {
        path: '/materials',
        component: () => import( "../components/MaterialsMain.vue" ),
      },
      {
        path: '/materials/create',
        component: () => import( "../components/MaterialsCreate.vue" ),
      },
      {
        path: '/materials/:idno',
        component: () => import( "../components/MaterialsItem.vue" ),
      },
      {
        path: '/vendors',
        component: () => import( "../components/VendorsMain.vue" ),
      },
      {
        path: '/vendors/create',
        component: () => import( "../components/VendorsCreate.vue" ),
      },
      {
        path: '/vendors/:idno',
        component: () => import( "../components/VendorsItem.vue" ),
      },
      {
        path: '/epicor_receives',
        component: () => import( "../components/EpicorReceivesMain.vue" ),
      },
      {
        path: '/epicor_receives/:vendor_num/:pack_slip',
        component: () => import( "../components/EpicorReceivesItem.vue" ),
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
    // beforeEnter(to, from) {window.location.href = '/404'},
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

  // Skip below logic
  if ( to.params === '/' ) {
    // console.debug( 'Go to login page for any reason!' );
    return { path: '/' }
  }

  // For any routes except for login one
  if (
    // 检查用户是否已登录
    authStore.isAuthenticated === false && to.meta.requiresAuth
  ) {
    // console.debug( 'Redirect un-authenticated user to login page' );
    // 将用户重定向到登录页面
    return { name: 'Login' };
  }

  // Refresh refresh token & access token on every request
  if ( authStore.isAuthenticated === true ) {
    // console.debug( 'isAuthenticated:\n', authStore.isAuthenticated );
    try {
      await authStore.refreshToken();
    } catch ( error ) {
      if ( error instanceof ApiError ) {
        if ( error.status === 422 || error.status === 401 ) {
          authStore.logout();
          // console.debug( 'logged out' );
          return { name: 'Login', params: { message: '登錄過期，請重新登入' } };
        }
      }
    }
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
