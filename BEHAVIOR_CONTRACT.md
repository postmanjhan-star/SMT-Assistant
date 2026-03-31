# Behavior Contract（行為守護清單）

重構期間不可改變的關鍵使用者行為。每次 PR 合併前，相關流程的 e2e 或 unit test 必須全綠。

---

## B1：Panasonic 換料流程

**覆蓋測試：** `tests/e2e/panasonic-assistant-detail-page.spec.ts`

步驟：
1. 使用者掃描料捲 barcode → 系統查詢料號並顯示匹配結果
2. 使用者掃描站別 barcode → 系統驗證站別合法性
3. 確認換料 → 系統呼叫上傳 API 並更新 grid 狀態
4. Grid 顯示正確的換料後狀態（顏色、料號、數量）

不可改變：
- 掃描順序不可顛倒（先料後站）
- 驗證失敗必須顯示 UI 錯誤訊息，不可靜默失敗
- 上傳成功後 grid 必須立即反映新狀態

---

## B2：Fuji 換料流程

**覆蓋測試：** `tests/e2e/fuji-mounter-production.spec.ts`、`tests/e2e/fuji-assistant-detail-page.spec.ts`

步驟：
1. 使用者掃描料捲 barcode → 系統查詢料號
2. 使用者掃描站別 barcode → 系統驗證
3. 確認換料 → 呼叫上傳 → 更新 grid

不可改變：
- 驗證規則（FujiMaterialMatchRules）行為不變
- 上傳失敗必須有 rollback 或明確錯誤提示

---

## B3：卸料（Unload）流程

**覆蓋測試：**

Unit（Phase 4 重構後，由 state machine 測試覆蓋）：
- `tests/unit/domain/mounter/operationModeStateMachine.spec.ts`（NORMAL→UNLOAD 狀態轉移、pack_auto_slot / force_single_slot 子流程）
- `tests/unit/ui/shared/useOperationModeStateMachine.spec.ts`（enterUnloadMode、exitToNormal）
- `tests/unit/ui/shared/fuji/useFujiOperationFlows.spec.ts`（pack_auto_slot / force_single_slot 卸除流程、handleExitUnloadMode）

E2E：
- `tests/e2e/fuji-assistant-detail-page.spec.ts`（fuji unload/replace 場景）
- `tests/e2e/panasonic-assistant-detail-page.spec.ts`（panasonic unload/replace 場景）

步驟：
1. 進入卸料模式 → UI 切換至卸料狀態
2. 掃描站別 → 系統確認卸料目標
3. 確認卸料 → 呼叫 API、更新 grid
4. 退出卸料模式 → UI 回復正常狀態

不可改變：
- 卸料模式下不可誤觸換料邏輯
- 退出模式必須清除暫存狀態

---

## B4：IPQC 流程

**覆蓋測試：**
- `tests/e2e/fuji-assistant-detail-page.spec.ts`（Fuji IPQC 場景）
- `tests/e2e/panasonic-assistant-detail-page.spec.ts`（Panasonic IPQC 場景）
- `tests/unit/ui/shared/composables/useMounterOperationFlowsCore.spec.ts`（IPQC 模式覆檢成功/料號不符警示/欄位顯示切換）

步驟：
1. IPQC 確認觸發 → 系統呼叫對應 API
2. IPQC 結果寫入後端
3. UI 顯示 IPQC 結果狀態

不可改變：
- IPQC 結果必須在 grid 中可視化呈現

---

## B5：後段上料（PostProductionFeed）上傳

**覆蓋測試：**
- `tests/unit/application/post-production-feed/PostProductionFeedUseCase.spec.ts`
- `tests/unit/application/post-production-feed/FujiPostProductionRecordUploader.spec.ts`
- `tests/unit/application/post-production-feed/PostProductionRecordUploader.spec.ts`
- `tests/e2e/post-production-feed.spec.ts`

步驟：
1. 後段上料資料準備完成 → 觸發上傳
2. Fuji/Panasonic 各自使用對應的 uploader
3. 上傳成功 → UI 顯示完成狀態
4. 上傳失敗 → UI 顯示錯誤，資料不遺失

不可改變：
- Fuji 與 Panasonic 上傳邏輯分離，不可混用
- 上傳的 record 格式（`PostProductionFeedRecord`）結構不變

---

## B6：料號查詢與驗證

**覆蓋測試：**
- `tests/unit/ui/shared/composables/useMaterialQueryState.spec.ts`
- `tests/unit/domain/material/BarcodeScanRules.spec.ts`

步驟：
1. 輸入 barcode → 系統呼叫查詢 API
2. 查詢結果顯示料號資訊
3. 若查無料號 → 顯示明確錯誤（不顯示空白）
4. 料號驗證通過 → 允許繼續流程

不可改變：
- `BarcodeScanRules` 中的驗證邏輯
- 查詢失敗必須顯示錯誤訊息，不可靜默

---

## B7：路由守衛（Panasonic Route Guards）

**覆蓋測試：**
- `tests/unit/router/panasonicRouteGuards.spec.ts`
- `tests/e2e/panasonic-route-guards.spec.ts`

不可改變：
- 未完成前置作業時，不允許進入生產頁面
- 路由守衛的條件判斷邏輯
- 被擋下時的重定向目標頁面

---

## 確認方式

| 流程 | 確認指令 |
|---|---|
| Unit tests | `npm run test -- --run` |
| E2E tests | `npx playwright test` |
| 特定 spec | `npm run test -- --run tests/unit/domain/...` |
