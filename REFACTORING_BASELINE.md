# Refactoring Baseline Report

---

## Wave 1 基線（Phase 0–6，2026-03-23 建立，2026-03-26 全部完成）

原始基線數字：

| KPI | Wave 1 基線 (2026-03-23) | Wave 1 完成後 (2026-03-30) |
|---|---|---|
| Pages/UI → client 違規檔案數 | 26 | 27 |
| Pages/UI → infra 違規檔案數 | 3 | 3 |
| Application → infra 違規檔案數 | 10 | 0（Phase 5 完成） |
| Domain → client/infra 違規 | 9 | 2 |
| Phase-1 whitelist 數 | 26 | 30 |
| 超過 500 行的檔案數 | 7 | 8 |
| Unit spec 檔案數 | 19 | 30（194 tests） |
| E2E spec 檔案數 | 7 | 8（81 tests） |

---

## Wave 2 基線（P0–P5，2026-03-30 建立）

用途：重構期間每次 PR 的比較基準，KPI 數字只能降不能升。

自動化檢查：`npm run check:kpi`

| KPI | Wave 2 基線 (2026-03-30) | P0–P5 目標終態 |
|---|---|---|
| Pages/UI → client 違規檔案數 | **27** | 0 |
| Pages/UI → infra 違規檔案數 | **3** | 0 |
| Domain → client/infra 違規 | **2** | 0 |
| Phase-1 whitelist 標記數 | **30** | 0 |
| 超過 500 行的檔案數（含 SmtService.ts） | **8** | ≤3（排除 generated） |
| Unit spec 檔案數 | **30** | ↑ 增加 |
| E2E spec 檔案數 | **8** | ↑ 增加 |

---

## Pages/UI → @/client 違規清單（27 個檔案，Wave 2 基線）

### src/pages/ 層（14 個）

| 檔案 | 違規行 |
|---|---|
| `src/pages/TaskManager.vue` | L15 |
| `src/pages/UploadFile.vue` | L7 |
| `src/pages/components/MaterialInventoryBarcodeInput.vue` | L5 |
| `src/pages/file-manager/MounterFileManager.vue` | L8 |
| `src/pages/file-manager/fujiMounter/FujiMounterFileItemBox.vue` | L4 |
| `src/pages/file-manager/panasonicMounter/PanasonicMounterFileItemBox.vue` | L4 |
| `src/pages/mounter/FujiHome.vue` | L6 |
| `src/pages/mounter/PanasonicHome.vue` | L7 |
| `src/pages/mounter/fuji/FujiMounterAssistantDetail.vue` | L19 |
| `src/pages/mounter/fuji/FujiMounterAssistantProduction.vue` | L12 |
| `src/pages/mounter/panasonic/PanasonicMounterAssistantDetail.vue` | L35 |
| `src/pages/mounter/panasonic/PanasonicMounterAssistantProduction.vue` | L36 |
| `src/pages/mounter/panasonic/components/StartProductionButton.vue` | L16 |
| `src/pages/mounter/panasonic/types/production.ts` | L1 |

### src/ui/ 層（13 個）

| 檔案 | 違規行 |
|---|---|
| `src/ui/shared/composables/usePreproductionLoader.ts` | L2 |
| `src/ui/shared/composables/useRollShortageForm.ts` | L4 |
| `src/ui/shared/composables/useUnloadReplaceFlow.ts` | L3 |
| `src/ui/shared/composables/useMounterHomeForm.ts` | — |
| `src/ui/shared/composables/useScanLoginModal.ts` | — |
| `src/ui/shared/composables/fuji/useFujiOperationFlows.ts` | — |
| `src/ui/shared/composables/panasonic/usePanasonicProductionOperationFlows.ts` | — |
| `src/ui/workflows/post-production/fuji/composables/useFujiMaterialQueryState.ts` | L2 |
| `src/ui/workflows/post-production/fuji/composables/useFujiProductionWorkflow.ts` | L16 |
| `src/ui/workflows/post-production/panasonic/composables/usePanasonicProductionState.ts` | L6 |
| `src/ui/workflows/post-production/panasonic/composables/usePanasonicProductionWorkflow.ts` | L10 |
| `src/ui/workflows/preproduction/fuji/FujiMounterGridAdapter.ts` | L1 |
| `src/ui/workflows/preproduction/fuji/composables/useFujiPreproductionData.ts` | L3 |
| `src/ui/workflows/preproduction/fuji/composables/useFujiPreproductionLifecycle.ts` | L15 |
| `src/ui/workflows/preproduction/fuji/composables/useFujiPreproductionSlotFlow.ts` | L2 |
| `src/ui/workflows/preproduction/fuji/composables/useFujiProductionState.ts` | L2 |
| `src/ui/workflows/preproduction/panasonic/composables/usePanasonicProductionData.ts` | L3 |

---

## Pages/UI → @/infra 違規清單（3 個檔案，Wave 2 基線）

| 檔案 | 違規行 | import 目標 |
|---|---|---|
| `src/pages/components/MaterialInventoryBarcodeInput.vue` | L7 | `@/infra/material/ApiMaterialRepository` |
| `src/ui/workflows/post-production/fuji/composables/useFujiProductionWorkflow.ts` | L34 | `@/infra/post-production/FujiPostProductionRecordApi` |
| `src/ui/workflows/preproduction/fuji/composables/useFujiPreproductionSlotFlow.ts` | L9 | `@/infra/material/ApiMaterialRepository` |

---

## Domain → @/client 違規清單（2 個，Phase 3 defer）

| 檔案 | 違規 import |
|---|---|
| `src/domain/preproduction/RollShortagePolicy.ts` | `@/client` 相關型別 |
| `src/domain/production/PostProductionFeedRecord.ts` | `@/client` 相關型別 |

---

## 超過 500 行的大檔（8 個，Wave 2 基線）

| 檔案 | 約略行數 |
|---|---|
| `src/client/services/SmtService.ts` | ~878（generated，不列入削減目標） |
| `src/ui/shared/composables/core/useMounterOperationFlowsCore.ts` | ~712 |
| `src/ui/shared/composables/fuji/useFujiOperationFlows.ts` | ~677 |
| `src/pages/mounter/panasonic/PanasonicMounterAssistantDetail.vue` | ~647 |
| `src/ui/shared/composables/panasonic/usePanasonicProductionOperationFlows.ts` | ~644 |
| `src/pages/mounter/panasonic/PanasonicMounterAssistantProduction.vue` | ~561 |
| `src/ui/workflows/post-production/fuji/composables/useFujiProductionWorkflow.ts` | ~523 |
| `src/pages/mounter/fuji/FujiMounterAssistantDetail.vue` | ~519 |

---

## 測試庫存（Wave 2 基線，2026-03-30）

### Unit Tests（30 個，vitest，194 個 test cases）

```
tests/unit/application/post-production-feed/FujiPostProductionRecordUploader.spec.ts
tests/unit/application/post-production-feed/PostProductionFeedUseCase.spec.ts
tests/unit/application/post-production-feed/PostProductionRecordUploader.spec.ts
tests/unit/application/slot-submit/MaterialGrid.spec.ts
tests/unit/application/slot-submit/NormalModeStrategy.spec.ts
tests/unit/application/slot-submit/TestModeStrategy.spec.ts
tests/unit/domain/file-manager/mergeMounterFiles.spec.ts
tests/unit/domain/file-manager/resolveMounterItemTargets.spec.ts
tests/unit/domain/material/BarcodeScanRules.spec.ts
tests/unit/domain/mounter/operationModeStateMachine.spec.ts
tests/unit/domain/production/PostProductionFeedRecord.spec.ts
tests/unit/domain/production/PostProductionFeedRules.spec.ts
tests/unit/domain/production/buildFujiProductionRowData.spec.ts
tests/unit/domain/production/buildPanasonicRowData.spec.ts
tests/unit/domain/slot/SlotBindingRules.spec.ts
tests/unit/router/panasonicRouteGuards.spec.ts
tests/unit/ui/post-production/PostProductionFeedGridAdapter.spec.ts
tests/unit/ui/shared/composables/useMaterialQueryState.spec.ts
tests/unit/ui/shared/composables/useMounterOperationFlowsCore.spec.ts
tests/unit/ui/shared/fuji/useFujiOperationFlows.spec.ts
tests/unit/ui/shared/panasonic/usePanasonicStatMap.spec.ts
tests/unit/ui/shared/useOperationModeStateMachine.spec.ts
```

（全部 30 個，上方僅列出 22 個代表性檔案；`npm run check:kpi` 以 `find` 實際計數）

### E2E Tests（8 個，Playwright，81 個 test cases）

```
tests/e2e/file-upload-page.spec.ts
tests/e2e/fuji-assistant-detail-page.spec.ts
tests/e2e/fuji-assistant-home-page.spec.ts
tests/e2e/fuji-mounter-production.spec.ts
tests/e2e/panasonic-assistant-detail-page.spec.ts
tests/e2e/panasonic-assistant-home-page.spec.ts
tests/e2e/panasonic-route-guards.spec.ts
tests/e2e/post-production-feed.spec.ts
```

---

## Phase-1 whitelist 追蹤

Phase-1 已在既有違規檔案加入 `eslint-disable no-restricted-imports -- [Phase-1 whitelist]` 標記。

**追蹤指令**（數字應隨重構進展逐漸趨近 0）：
```bash
grep -r "Phase-1 whitelist" src/ | wc -l
```

---

## 禁止退步聲明（Wave 2）

每次 PR 合併前必須確認（`npm run check:kpi` 自動執行）：

1. Phase-1 whitelist 標記數 ≤ 30（逐步減少，不得增加）
2. src/ 下 >500 行檔案數 ≤ 8（逐步減少，不得增加）
3. Unit spec 檔案數 ≥ 22（只增不減）
4. E2E spec 檔案數 ≥ 8（只增不減）
5. Domain → client/infra 違規 ≤ 2（不得增加）

降低閾值後，請同步更新 `scripts/check-kpi.sh` 中的對應常數。
