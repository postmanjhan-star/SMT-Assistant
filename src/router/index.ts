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
    path: '/wms',
    meta: { requiresAuth: false },
    component: () => import( '../wms-app/WmsAppView.vue' ),
    children: [
      {
        path: "login",
        name: "WmsLogin",
        meta: { requiresAuth: false },
        component: () => import( "../wms-app/LoginView.vue" ),
        props: true,
      },
      {
        path: "home",
        meta: { requiresAuth: true },
        component: () => import( "../wms-app/WmsHomeView.vue" ),
        children: [
          {
            path: '',
            component: () => import( "../wms-app/components/HomeMain.vue" ),
          },
          {
            path: "/wms/accounts",
            meta: { requiredAuthModule: [ "see_system_group" ] },
            component: () => import( "../wms-app/components/AccountsMaster.vue" ),
          },
          {
            path: '/wms/accounts/create',
            meta: { requiredAuthModule: [ 'see_system_group' ] },
            component: () => import( "../wms-app/components/AccountsCreate.vue" ),
          },
          {
            path: '/wms/accounts/:idno',
            meta: { requiredAuthModule: [ 'see_system_group' ] },
            component: () => import( "../wms-app/components/AccountsItem.vue" ),
          },
          {
            path: '/wms/storages',
            component: () => import( "../wms-app/components/StoragesMain.vue" ),
          },
          {
            path: '/wms/storages/create',
            component: () => import( "../wms-app/components/StoragesCreate.vue" ),
          },
          {
            path: '/wms/storages/:id',
            component: () => import( "../wms-app/components/StoragesDetail.vue" ),
          },
          {
            path: '/wms/storages/:id/edit',
            component: () => import( "../wms-app/components/StoragesEdit.vue" ),
          },
          {
            path: '/wms/materials',
            component: () => import( "../wms-app/components/MaterialsMaster.vue" ),
          },
          {
            path: '/wms/materials/create_raw_material',
            component: () => import( "../wms-app/components/MaterialsCreateRawMaterial.vue" ),
          },
          {
            path: '/wms/materials/create_product',
            component: () => import( "../wms-app/components/MaterialsCreateProduct.vue" ),
          },
          {
            path: '/wms/materials/create_in_process_material',
            component: () => import( "../wms-app/components/MaterialsCreateInProcessMaterial.vue" ),
          },
          {
            path: '/wms/materials/:idno',
            component: () => import( "../wms-app/components/MaterialsDetail.vue" ),
          },
          {
            path: '/wms/materials/:idno/edit',
            component: () => import( "../wms-app/components/MaterialsEditMaster.vue" ),
          },
          {
            path: '/wms/vendors',
            component: () => import( "../wms-app/components/VendorsMain.vue" ),
          },
          {
            path: '/wms/vendors/create',
            component: () => import( "../wms-app/components/VendorsCreate.vue" ),
          },
          {
            path: '/wms/vendors/:idno',
            component: () => import( "../wms-app/components/VendorsItem.vue" ),
          },
          {
            path: '/wms/epicor_receives',
            component: () => import( "../wms-app/components/EpicorReceivesMain.vue" ),
          },
          {
            path: '/wms/epicor_receives/:vendor_num/:pack_slip',
            component: () => import( "../wms-app/components/EpicorReceivesItem.vue" ),
          },
          {
            path: '/wms/receives',
            component: () => import( "../wms-app/components/ReceivesMain.vue" ),
          },
          {
            path: '/wms/receives/create',
            name: 'receivesCreate',
            component: () => import( "../wms-app/components/ReceivesCreate.vue" ),
            props: route => ( {
              st_receive_idno: route.params.st_receive_idno,
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
            path: '/wms/receives/:idno',
            component: () => import( "../wms-app/components/ReceivesItem.vue" ),
          },
          {
            path: '/wms/transfers',
            component: () => import( "../wms-app/components/MaterialInventoryTransferMain.vue" ),
          },
          {
            path: '/wms/issuances',
            component: () => import( "../wms-app/components/IssuancesMain.vue" ),
          },
          {
            path: '/wms/issuances/create',
            component: () => import( "../wms-app/components/IssuancesCreate.vue" ),
          },
          {
            path: '/wms/issuances/:idno',
            component: () => import( "../wms-app/components/IssuancesItem.vue" ),
          },
          {
            path: '/wms/issuances/:idno/pick',
            component: () => import( "../wms-app/components/IssuancesPick.vue" ),
          },
          {
            path: '/wms/issuance_returns',
            component: () => import( "../wms-app/components/IssuanceReturnsMaster.vue" ),
          },
          {
            path: '/wms/issuance_returns/create',
            component: () => import( "../wms-app/components/IssuanceReturnsCreate.vue" ),
          },
          {
            path: '/wms/st_erp_receives',
            component: () => import( "../wms-app/components/StErpReceivesMaster.vue" ),
          },
          {
            path: '/wms/st_erp_work_orders',
            component: () => import( "../wms-app/components/StErpWorkOrdersMaster.vue" ),
          },
          {
            path: '/wms/st_erp_work_orders/:idno',
            component: () => import( "../wms-app/components/StErpWorkOrdersDetail.vue" ),
          },
        ],
      },
    ],
  },
  {
    path: "/wms/issuances/:idno/print",
    meta: { requiresAuth: true },
    component: () => import( "../wms-app/IssuancesPickingUpPrintView.vue" ),
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

  // 检查用户是否已登录
  if ( authStore.isAuthenticated === false && to.meta.requiresAuth ) {
    // 将用户重定向到登录页面
    return { name: 'WmsLogin' };
  }

  // Refresh `refresh_token` & `access_token` with every request
  if ( authStore.isAuthenticated === true ) {
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
