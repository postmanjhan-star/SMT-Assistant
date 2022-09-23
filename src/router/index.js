import { createRouter, createWebHistory } from "vue-router";
import { ApiError } from "../client";
import { useAccountStore } from "../stores/account";
import { useAuthStore } from "../stores/auth";

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
        path: '/storages/:id',
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
      {
        path: '/receives',
        component: () => import( "../components/ReceivesMain.vue" ),
      },
      {
        path: '/receives/create',
        name: 'receivesCreate',
        component: () => import( "../components/ReceivesCreate.vue" ),
        props: route => ( {
          st_receive_idno: route.params.st_receive_idno,
          st_record_idno: route.params.st_record_idno,
          st_vendor_id: Number( route.params.st_vendor_id ),
          st_mbr_idno: route.params.st_mbr_idno,
          st_purchase_idno: route.params.st_purchase_idno,
          material_idno: route.params.material_idno,
          total_qty: Number( route.params.total_qty ),
          qualify_qty: Number( route.params.qualify_qty ),
          st_barcodes: route.params.st_barcodes,
        } ),
      },
      {
        path: '/receives/:idno',
        component: () => import( "../components/ReceivesItem.vue" ),
      },
      {
        path: '/transfers',
        component: () => import( "../components/MaterialInventoryTransferMain.vue" ),
      },
      {
        path: '/issuances',
        component: () => import( "../components/IssuancesMain.vue" ),
      },
      {
        path: '/issuances/create',
        component: () => import( "../components/IssuancesCreate.vue" ),
      },
      {
        path: '/issuances/:idno',
        component: () => import( "../components/IssuancesItem.vue" ),
      },
      {
        path: '/issuances/:idno/pick',
        component: () => import( "../components/IssuancesPick.vue" ),
      },
      {
        path: '/issuance_returns',
        component: () => import( "../components/IssuanceReturnsMaster.vue" ),
      },
      {
        path: '/issuance_returns/create',
        component: () => import( "../components/IssuanceReturnsCreate.vue" ),
      },
      {
        path: '/st_erp_receives',
        component: () => import( "../components/StErpReceivesMain.vue" ),
      },
    ],
  },
  {
    path: "/issuances/:idno/print",
    meta: { requiresAuth: true },
    component: () => import( "../views/IssuancesPickingUpPrintView.vue" ),
  },
  {
    path: "/smt",
    meta: { requiresAuth: false },
    component: () => import( "../smtViews/HomeView.vue" ),
    children: [
      {
        path: '/smt/mounter/work_orders',
        component: () => import( "../smtViews/WorkOrdersHome.vue" ),
      },
      {
        path: '/smt/mounter/work_orders/:workOrderIdno',
        component: () => import( "../smtViews/WorkOrdersDetail.vue" ),
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

// 4. 内部提供了 history 模式的实现。
const router = createRouter( { history: createWebHistory(), routes: routes, } );


router.beforeEach( async ( to, from ) => {
  const authStore = useAuthStore();
  const accountStore = useAccountStore();

  // Skip below logic
  if ( to.params === '/' ) { return { path: '/' }; }

  // For any routes except for login one
  // 检查用户是否已登录
  if ( authStore.isAuthenticated === false && to.meta.requiresAuth ) {
    // 将用户重定向到登录页面
    return { name: 'Login' };
  }

  // Refresh `refresh_token` & `access_token` with every request
  if ( authStore.isAuthenticated === true ) {
    try { await authStore.refreshToken(); }
    catch ( error ) {
      // Just logout on error occurs. No matter what the error is.
      // console.debug( error );
      // if ( error instanceof ApiError ) {
      //   if ( error.status === 422 || error.status === 401 ) {
          authStore.logout();
          return { name: 'Login', params: { message: '登錄過期，請重新登入' } };
      //   }
      // }
    }
  }

  if (
    to.meta.requiredAuthModule &&
    to.meta.requiredAuthModule.includes( 'see_system_group' ) &&
    !accountStore.authorizedModules.includes( 'see_system_group' )
  ) { return { path: '/403' } }
} );

export default router;
