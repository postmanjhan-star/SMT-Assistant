import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router";
import { useAccountStore } from "../stores/account";
import { useAuthStore } from "../stores/auth";

// 2. 定义一些路由
// 每个路由都需要映射到一个组件。
// 这些都会传递给 `createRouter`
const routes: RouteRecordRaw[] = [
  {
    path: '',
    meta: { requiresAuth: false },
    component: () => import( '../start-app/StartAppView.vue' ),
    children: [
      {
        path: "",
        name: "StartHome",
        meta: { requiresAuth: false },
        component: () => import( "../start-app/StartHomeView.vue" ),
        props: true,
      }
    ]
  },
  {
    path: "/smt",
    meta: { requiresAuth: false },
    component: () => import( "../smt-app/HomeView.vue" ),
    children: [
      {
        path: '/smt/fuji-mounter',
        component: () => import( "../smt-app/FujiMounterAssistantHome.vue" ),
      },
      {
        path: '/smt/fuji-mounter/:mounterIdno/:workOrderIdno',
        component: () => import( "../smt-app/FujiMounterAssistantDetail.vue" ),
      },
      {
        path: '/smt/fuji-mounter/upload_fst',
        component: () => import( "../smt-app/UploadFujiFile.vue" ),
      },
      {
        path: '/smt/panasonic-mounter',
        component: () => import( "../smt-app/PanasonicMounterAssistantHome.vue" ),
      },
      {
        path: '/smt/panasonic-mounter/upload_csv',
        component: () => import( "../smt-app/UploadPanasonicFile.vue" ),
      },
      {
        path: '/smt/panasonic-mounter/:mounterIdno/:workOrderIdno',
        component: () => import( "../smt-app/PanasonicMounterAssistantDetail.vue" ),
      },
    ],
  },
  {
    path: '',
    meta: { requiresAuth: false },
    component: () => import( '../temperature-humidity-app/TemperatureHumidityApp.vue' ),
    children: [
      {
        path: "/temperature-humidity",
        name: "TemperatureHumidity",
        meta: { requiresAuth: false },
        component: () => import( "../temperature-humidity-app/Home.vue" ),
        props: true,
      },
      {
        path: "/temperature-humidity/query",
        name: "TemperatureHumidityQuery",
        meta: { requiresAuth: false },
        component: () => import( "../temperature-humidity-app/Query.vue" ),
        props: true,
      },
    ]
  },
  {
    path: "/playground",
    name: "Playground",
    meta: { requiresAuth: false },
    component: () => import( "../views/PlaygroundView.vue" ),
  },
  {
    path: "/http-status",
    name: "HttpStatus",
    meta: { requiresAuth: false },
    component: () => import( "../views/HttpStatusView.vue" ),
    children: [
      {
        path: "403",
        name: "Forbidden",
        meta: { requiresAuth: false },
        component: () => import( "../views/ForbiddenView.vue" ),
      },
      {
        path: "404",
        name: "NotFound",
        meta: { requiresAuth: false },
        component: () => import( "../views/NotFoundView.vue" ),
      },
      {
        path: "/:pathMatch(.*)",
        name: "NotFound",
        meta: { requiresAuth: false },
        // beforeEnter(to, from) {window.location.href = '/http-status/404'},
        component: () => import( "../views/NotFoundView.vue" ),
      },
    ],
  },
]

// 3. 创建路由实例并传递 `routes` 配置
// 你可以在这里输入更多的配置，但我们在这里
// 暂时保持简单

// 4. 内部提供了 history 模式的实现。
const router = createRouter( { history: createWebHistory(), routes: routes, } );


router.beforeEach( async ( to, from ) => {
  const authStore = useAuthStore();
  const accountStore = useAccountStore();

  // Case A：頁面需登入，用戶已登入 -> 用戶登入憑證仍有效，導向目的頁、用戶登入憑證無效，導向登入頁。
  // Case B：頁面需登入，用戶未登入 -> 導向登入頁。
  // Case C：頁面不須登入，無論用戶有無登入 -> 導向目的頁。

  // Case B
  // 检查用户是否已登录
  if ( authStore.isAuthenticated === false && to.meta.requiresAuth ) {
    // 将用户重定向到登录页面
    return { name: 'WmsLogin' };
  }

  // Case A
  // Refresh `refresh_token` & `access_token` with every request
  if ( authStore.isAuthenticated === true && to.meta.requiresAuth ) {
    try { await authStore.refreshToken(); }
    catch ( error ) {
      await authStore.logout();
      return { name: 'WmsLogin', params: { message: '登錄過期，請重新登入' } };
    }
  }

  const requiredAuthModule = to.meta.requiredAuthModule as string[];
  if ( requiredAuthModule?.includes( 'see_system_group' ) && !accountStore.authorizedModules.includes( 'see_system_group' ) ) { return { path: '/http-status/403' } }
} );

export default router;
