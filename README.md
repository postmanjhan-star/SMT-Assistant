# Sentec SMT Assistant

SMT 打件流程輔助前端，提供 Fuji 與 Panasonic 打件機相關的掃碼、上料、換料、卸料、生產中操作，以及打件檔上傳與管理介面。

本專案目前是一個以 Vue 3 + TypeScript 為主的單頁應用，路由基底為 `/smt`，並透過 `/api` 與後端服務整合。

## 功能總覽

- Fuji 打件機流程
  - 首頁查詢工令與打件資料
  - 明細頁掃描料捲與站位
  - 換料、錯站檢查、卸料 / Replace、IPQC、Splice 流程
  - 生產頁後段上料操作
- Panasonic 打件機流程
  - 首頁查詢工令與打件資料
  - 明細頁掃描料捲與站位
  - 換料、卸料 / Replace、IPQC、Splice 流程
  - 生產頁後段上料操作
- 共用輔助功能
  - 打件檔上傳，支援 `.csv` 與 `.fst`
  - 打件檔管理頁，可檢視與刪除 Fuji / Panasonic 打件檔
  - 打件工作管理頁，可查看 workflow summary 並進入生產頁
  - Panasonic 路由守衛，限制未完成前置條件時直接進入生產頁

關鍵行為與測試守護清單整理在 [BEHAVIOR_CONTRACT.md](./BEHAVIOR_CONTRACT.md)。

## 技術棧

- Vue 3
- Vite
- TypeScript
- Pinia
- Vue Router
- Naive UI
- AG Grid
- Tabulator
- Vitest
- Playwright
- OpenAPI generated client via `openapi-typescript-codegen`

## 架構說明

專案正在往分層架構整理，主要依賴方向如下：

```text
UI -> Application -> Domain
Application -> Infrastructure
```

主要目錄：

```text
src/
  application/      用例與流程編排
  domain/           業務規則與純函式
  infra/            API adapter 與基礎設施實作
  infrastructure/   額外 repository 層實作
  ui/               composables、workflow adapters、DI
  pages/            路由頁面與頁面元件
  router/           路由定義與 guards
  stores/           Pinia stores
  client/           OpenAPI 產生的 API client
```

延伸文件：

- [ARCHITECTURE.md](./ARCHITECTURE.md): 分層架構說明
- [BEHAVIOR_CONTRACT.md](./BEHAVIOR_CONTRACT.md): 重構期間不可破壞的流程
- [REFACTORING_BASELINE.md](./REFACTORING_BASELINE.md): 重構基線與狀態

## 路由

目前主要路由如下：

- `/smt/fuji-mounter`
- `/smt/fuji-mounter/:mounterIdno/:workOrderIdno`
- `/smt/fuji-mounter-production/:productionUuid`
- `/smt/panasonic-mounter`
- `/smt/panasonic-mounter/:mounterIdno/:workOrderIdno`
- `/smt/panasonic-mounter-production/:productionUuid`
- `/smt/file-upload`
- `/smt/file-manager`
- `/smt/task-manager`

另外也保留：

- `/playground`
- `/http-status/403`
- `/http-status/404`

## 環境需求

- Node.js 18+
- npm

專案內目前有這些環境檔：

- `.env.development`
- `.env.staging`
- `.env.production`

目前可見的前端環境變數包含：

- `VITE_APP_TITLE`
- `VITE_BACKEND_BASE_URL`

補充：

- Vite `base` 設定為 `/smt`
- 產生的 API client 預設以 `/api` 為後端入口
- `src/main.ts` 會在每次請求時動態從 `authStore` 提供 token

## 本機開發

1. 安裝依賴

```sh
npm install
```

2. 啟動前端開發伺服器

```sh
npm run dev
```

3. 直接開啟前端頁面

```text
http://localhost:5175/smt
```

### 本機 API 整合注意事項

前端請求會打到 `/api`，但 `vite.config.ts` 目前沒有內建 dev proxy。

如果你要在本機跑完整前後端流程，建議拓樸如下：

- 前端 Vite：`localhost:5175`
- 後端 API：`:8000`
- 反向代理：將 `/api/*` 轉發到 `:8000`，其餘流量轉發到 `localhost:5175`

專案已附 `Caddyfile`，目前規則為：

- `/api/*` -> `:8000`
- 其他路徑 -> `localhost:5175`

若使用這份設定，可改由 `http://127.0.0.1/smt` 進入應用。

## 可用指令

| 指令 | 說明 |
| --- | --- |
| `npm run dev` | 啟動 Vite 開發伺服器 |
| `npm run build` | 以預設 mode 建置 |
| `npm run build:staging` | 以 staging mode 建置 |
| `npm run build:production` | 以 production mode 建置 |
| `npm run preview` | 本機預覽 build 結果 |
| `npm run lint` | 執行 ESLint |
| `npm run lint:fix` | 執行 ESLint 並修正可自動修正項目 |
| `npm run test` | 啟動 Vitest |
| `npm run test:unit` | 以 `jsdom` 執行 unit tests |
| `npm run coverage` | 輸出測試覆蓋率 |
| `npm run generate` | 重新產生 OpenAPI client |
| `npm run check:kpi` | 執行 KPI 檢查腳本 |
| `npm run check:behavior-contract` | 檢查行為守護契約相關項目 |

## API Client 重新產生

若後端 OpenAPI 規格有更新，可重新產生 `src/client`：

```sh
npm run generate
```

此指令會讀取：

```text
http://localhost/api/openapi.json
```

執行前請先確認本機能取得後端 OpenAPI spec。

## 測試

### Unit tests

```sh
npm run test -- --run
```

或：

```sh
npm run test:unit
```

### E2E tests

E2E 測試位於 `tests/e2e`，目前覆蓋的主流程包含：

- Fuji / Panasonic 首頁
- Fuji / Panasonic 明細頁
- 錯站檢查
- 卸料 / Replace
- IPQC
- Splice
- 後段上料
- Panasonic route guards
- 檔案上傳

執行方式：

```sh
npx playwright test
```

目前 Playwright 設定重點：

- `baseURL` 為 `http://127.0.0.1`
- 不會自動幫你啟動 web server
- 預設 `headless: false`
- 保留失敗時的 trace、screenshot、video

## 部署摘要

部署上至少需要確認：

- build 後靜態檔可正確提供 `/smt/*`
- `/api/*` 會被反向代理到後端服務
- 前端與後端位於相同 host 時，可直接使用 `/api`

常見流程通常是：

```sh
npm install
npm run build:staging
```

或：

```sh
npm install
npm run build:production
```

再由 Caddy 或其他 reverse proxy 提供靜態檔與 `/api` 代理。

## 疑難排解

### 開頁後一片空白

- 確認是從 `/smt` 路徑進入，而不是只開 `/`
- 確認部署環境有支援 SPA history fallback

### 本機 API 404

- 確認 `/api` 已經被反向代理到後端
- 確認後端服務已啟動且可從目前 host 連到

### Playwright 無法進入頁面

- 先手動啟動前端與需要的後端服務
- 確認 `playwright.config.ts` 的 `baseURL` 與你實際使用的 host 一致
