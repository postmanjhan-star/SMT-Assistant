## 說明

<!-- 簡述本 PR 做了什麼、為什麼 -->

## 影響層級（Impact Layer）

<!-- 勾選本次改動涉及的層級 -->
- [ ] Domain（純規則層，src/domain/）
- [ ] Application（流程層，src/application/）
- [ ] UI（顯示層，src/ui/ 或 src/pages/）
- [ ] Infrastructure / Client（src/infra/ 或 src/client/）

## KPI 影響（對照 REFACTORING_BASELINE.md）

| KPI | Before | After |
|---|---|---|
| Pages/UI → client 違規數 | | |
| Pages/UI → infra 違規數 | | |
| 超過 500 行的大檔數 | | |

<!-- 若本 PR 不涉及跨層搬移，填「不變」即可 -->

## 行為守護確認（對照 BEHAVIOR_CONTRACT.md）

- [ ] 本 PR 未改變任何 BEHAVIOR_CONTRACT.md 中的使用者行為
- [ ] 若有改動，已更新對應 spec 並確認通過：`npm run test -- --run`
- [ ] E2E 關鍵流程確認不受影響（或已更新）
