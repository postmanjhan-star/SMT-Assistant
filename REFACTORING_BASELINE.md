# Refactoring Baseline Report

建立日期：2026-03-23
用途：重構期間每次 PR 的比較基準，KPI 數字只能降不能升。

---

## Architecture KPI 基線

| KPI | 基線值 | 目標終態 |
|---|---|---|
| Pages/UI → client 違規檔案數 | **26** | 0（只留 adapter 層） |
| Pages/UI → infra 違規檔案數 | **3** | 0 |
| Domain → client/infra 違規 | **2**（Phase 3 修復目標，剩 PanasonicFeedRecordCreate）| 0 |
| 超過 500 行的檔案數 | **7** | ≤ 3 |
| Unit test 檔案數 | **19** | ↑ 增加 |
| E2E test 檔案數 | **7** | 守住不減 |

---

## Pages/UI → @/client 違規清單（26 個檔案）

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

### src/ui/ 層（12 個）

| 檔案 | 違規行 |
|---|---|
| `src/ui/shared/composables/usePreproductionLoader.ts` | L2 |
| `src/ui/shared/composables/useRollShortageForm.ts` | L4 |
| `src/ui/shared/composables/useUnloadReplaceFlow.ts` | L3 |
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

## Pages/UI → @/infra 違規清單（3 個檔案）

| 檔案 | 違規行 | import 目標 |
|---|---|---|
| `src/pages/components/MaterialInventoryBarcodeInput.vue` | L7 | `@/infra/material/ApiMaterialRepository` |
| `src/ui/workflows/post-production/fuji/composables/useFujiProductionWorkflow.ts` | L34 | `@/infra/post-production/FujiPostProductionRecordApi` |
| `src/ui/workflows/preproduction/fuji/composables/useFujiPreproductionSlotFlow.ts` | L9 | `@/infra/material/ApiMaterialRepository` |

---

## Domain → @/client 違規清單（9 個檔案，Phase 2 修復目標）

| 檔案 | 違規 import |
|---|---|
| `src/domain/material/FujiMaterialMatchRules.ts` | `CheckMaterialMatchEnum` from `@/client` |
| `src/domain/material/MaterialLookupError.ts` | `ApiError` from `@/client` |
| `src/domain/material/buildPanasonicMaterialQueryRows.ts` | `CheckMaterialMatchEnum` 等 from `@/client` |
| `src/domain/preproduction/RollShortagePolicy.ts` | `CheckMaterialMatchEnum` 等 from `@/client` |
| `src/domain/production/FujiProductionRowBuilder.ts` | `CheckMaterialMatchEnum`, `FujiMounterFileRead` from `@/client` |
| `src/domain/production/PanasonicProductionRowBuilder.ts` | `PanasonicMounterFileItemRead` from `@/client` |
| `src/domain/production/PostProductionFeedRecord.ts` | `CheckMaterialMatchEnum` 等 from `@/client` |
| `src/domain/production/buildFujiProductionRowData.ts` | `CheckMaterialMatchEnum` 等 from `@/client` |
| `src/domain/production/buildPanasonicRowData.ts` | `CheckMaterialMatchEnum` 等 from `@/client` |

---

## 超過 500 行的大檔（7 個）

| 檔案 | 行數 |
|---|---|
| `src/pages/mounter/panasonic/PanasonicMounterAssistantDetail.vue` | 1,488 |
| `src/pages/mounter/fuji/FujiMounterAssistantDetail.vue` | 1,277 |
| `src/pages/mounter/panasonic/PanasonicMounterAssistantProduction.vue` | 950 |
| `src/client/services/SmtService.ts` | 824 |
| `src/pages/mounter/fuji/FujiMounterAssistantProduction.vue` | 811 |
| `src/ui/workflows/post-production/fuji/composables/useFujiProductionWorkflow.ts` | 536 |
| `src/ui/workflows/post-production/panasonic/composables/usePanasonicProductionWorkflow.ts` | 487 |

---

## 測試庫存

### Unit Tests（19 個，vitest）

```
tests/unit/ui/shared/composables/useMaterialQueryState.spec.ts
tests/unit/ui/shared/useUnloadModeController.spec.ts
tests/unit/ui/shared/panasonic/usePanasonicStatMap.spec.ts
tests/unit/ui/post-production/PostProductionFeedGridAdapter.spec.ts
tests/unit/application/post-production-feed/PostProductionRecordUploader.spec.ts
tests/unit/application/post-production-feed/PostProductionFeedUseCase.spec.ts
tests/unit/application/post-production-feed/FujiPostProductionRecordUploader.spec.ts
tests/unit/application/slot-submit/MaterialGrid.spec.ts
tests/unit/application/slot-submit/TestModeStrategy.spec.ts
tests/unit/application/slot-submit/NormalModeStrategy.spec.ts
tests/unit/domain/production/buildFujiProductionRowData.spec.ts
tests/unit/domain/production/PostProductionFeedRecord.spec.ts
tests/unit/domain/production/buildPanasonicRowData.spec.ts
tests/unit/domain/production/PostProductionFeedRules.spec.ts
tests/unit/domain/file-manager/resolveMounterItemTargets.spec.ts
tests/unit/domain/file-manager/mergeMounterFiles.spec.ts
tests/unit/domain/slot/SlotBindingRules.spec.ts
tests/unit/domain/material/BarcodeScanRules.spec.ts
tests/unit/router/panasonicRouteGuards.spec.ts
```

### E2E Tests（7 個，Playwright）

```
tests/e2e/fuji-mounter-production.spec.ts
tests/e2e/panasonic-route-guards.spec.ts
tests/e2e/fuji-assistant-detail-page.spec.ts
tests/e2e/panasonic-assistant-detail-page.spec.ts
tests/e2e/panasonic-assistant-home-page.spec.ts
tests/e2e/file-upload-page.spec.ts
tests/e2e/post-production-feed.spec.ts
```

---

## Phase 1 白名單（eslint-disable 追蹤）

Phase 1 已在所有既有違規檔案加入 `eslint-disable no-restricted-imports -- [Phase-1 whitelist]` 標記。

**追蹤指令**（數字應隨重構進展逐漸趨近 0）：
```bash
grep -r "Phase-1 whitelist" src/ | wc -l
```

**規則**：
- 每次 PR 修掉一個違規 import，就刪掉對應的 eslint-disable comment
- 新加的 src/pages 或 src/ui 檔案中，不得有任何 `@/client` 或 `@/infra` import（無 disable comment 的情況下，lint 會報 error 阻擋 PR）
- CI 中 `npm run lint` 執行失敗會阻擋 playwright 跑起來

---

## 禁止退步聲明

每次 PR 合併前必須確認：
1. Pages/UI → client 違規數 ≤ 26（逐步減少，不得增加）
2. Pages/UI → infra 違規數 ≤ 3（逐步減少，不得增加）
3. Domain → client/infra 違規數 ≤ 2（Phase 3 移除，不得增加）
4. 超過 500 行的檔案數 ≤ 7（逐步減少，不得增加）
5. Unit test 數 ≥ 19（只增不減）
6. E2E test 數 ≥ 7（只增不減）
