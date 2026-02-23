import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router";
import {
  guardPanasonicDetailRoute,
  guardPanasonicProductionRoute,
} from "./panasonicRouteGuards";

// 2. 定义一些路由
// 每个路由都需要映射到一个组件。
// 这些都会传递给 `createRouter`
const routes: RouteRecordRaw[] = [
  {
    path: "/smt",
    meta: { requiresAuth: false },
    component: () => import("../pages/HomeView.vue"),
    children: [
      {
        path: '/smt/fuji-mounter',
        component: () => import("../pages/mounter/FujiHome.vue"),
      },
      {
        path: '/smt/fuji-mounter/:mounterIdno/:workOrderIdno',
        component: () => import("../pages/mounter/fuji/FujiMounterAssistantDetail.vue"),
      },
      {
        path: '/smt/panasonic-mounter',
        component: () => import("../pages/mounter/PanasonicHome.vue"),
      },
      {
        path: '/smt/file-upload',
        component: () => import("../pages/UploadFile.vue"),
      },
      {
        path: '/smt/file-manager',
        component: () => import("../pages/file-manager/MounterFileManager.vue"),
      },
      {
        path: '/smt/panasonic-mounter/:mounterIdno/:workOrderIdno',
        beforeEnter: guardPanasonicDetailRoute,
        component: () => import("../pages/mounter/panasonic/PanasonicMounterAssistantDetail.vue"),
      },
      {
        path: '/smt/task-manager',
        component: () => import("../pages/TaskManager.vue"),
      },
      {
        path: '/smt/panasonic-mounter-production/:productionUuid',
        beforeEnter: guardPanasonicProductionRoute,
        component: () => import("../pages/mounter/panasonic/PanasonicMounterAssistantProduction.vue")
      },
      {
        path: '/smt/fuji-mounter-production/:productionUuid',
        component: () => import("../pages/mounter/fuji/FujiMounterAssistantProduction.vue")
      }
    ],
  },
  {
    path: "/playground",
    name: "Playground",
    meta: { requiresAuth: false },
    component: () => import("../pages/PlaygroundView.vue"),
  },
  {
    path: "/http-status",
    name: "HttpStatus",
    meta: { requiresAuth: false },
    component: () => import("../pages/HttpStatusView.vue"),
    children: [
      {
        path: "403",
        name: "Forbidden",
        meta: { requiresAuth: false },
        component: () => import("../pages/ForbiddenView.vue"),
      },
      {
        path: "404",
        name: "NotFound",
        meta: { requiresAuth: false },
        component: () => import("../pages/NotFoundView.vue"),
      },
      {
        path: "/:pathMatch(.*)",
        name: "NotFound",
        meta: { requiresAuth: false },
        // beforeEnter(to, from) {window.location.href = '/http-status/404'},
        component: () => import("../pages/NotFoundView.vue"),
      },
    ],
  },
]

// 3. 创建路由实例并传递 `routes` 配置
// 你可以在这里输入更多的配置，但我们在这里
// 暂时保持简单

// 4. 内部提供了 history 模式的实现。
const router = createRouter({ history: createWebHistory(), routes: routes, })


router.beforeEach(async (to, from) => { })

export default router;
