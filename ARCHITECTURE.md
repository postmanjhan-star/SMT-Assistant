# 📦 Frontend Architecture (Domain / Application Layered)

## 🧭 Overview

本專案採用 **Layered Architecture（分層架構）**，將系統拆為：

- Domain（業務規則）
- Application（流程 / UseCase）
- UI（Vue / Composables）
- Infrastructure（API / Repository）

---

## 🔑 核心設計原則

### 1️⃣ 分離關注點（Separation of Concerns）

- UI 不負責業務邏輯
- Domain 不知道 API / UI
- Application 負責流程

---

### 2️⃣ 依賴方向（最重要）

```text
UI → Application → Domain
Application → Infrastructure

❌ Domain 不可依賴任何外層
❌ UI 不可直接呼叫 Domain
```

---

### 3️⃣ 單向資料流

```text
UI
 ↓
Application
 ↓
Domain
 ↓
Application（決策）
 ↓
Infrastructure（API）
 ↓
UI 更新
```

---

## 🧠 1. Domain Layer（核心業務邏輯）

### 🎯 責任

- 業務規則（Business Rules）
- 驗證邏輯
- 狀態是否合法
- 純函式（Pure Function）

### 🚫 禁止事項

- ❌ Vue / React
- ❌ API / HTTP
- ❌ Store（Pinia）
- ❌ ref / reactive
- ❌ side effects

### ✅ 特性

- 純 TypeScript
- 可單測（Vitest）
- 可移植 backend

### 📁 對應目錄

```text
src/domain/
  material/
  production/
  slot/
  file-manager/
```

### 📌 範例

```ts
export function validateBarcode(code: string): boolean {
  return code.length > 0
}
```

---

## 🧭 2. Application Layer（UseCase / 流程控制）

### 🎯 責任

- UseCase 編排
- 呼叫 Domain
- 呼叫 API（Infrastructure）
- 操作 Store
- 控制副作用

👉 Application = 系統「大腦」

### ❌ 禁止事項

- ❌ 不寫 UI
- ❌ 不操作 DOM
- ❌ 不寫業務規則

### ✅ 可以做

- API 呼叫
- 流程控制
- 組合多個 Domain
- 錯誤處理

### 📁 對應目錄

```text
src/application/
  barcode-scan/
  panasonic/
  fuji/
  preproduction/
  post-production-feed/
  slot-submit/
```

### 🧩 命名規則

```text
XXXUseCase.ts
StartXXX.ts
StopXXX.ts
SubmitXXX.ts
```

### 📌 範例

```ts
import { validateBarcode } from '@/domain/material/BarcodeValidator'
import { api } from '@/infra/api'

export async function barcodeScanUseCase(code: string) {
  if (!validateBarcode(code)) {
    return { success: false }
  }

  const result = await api.scan(code)

  return { success: true, data: result }
}
```

---

## 🎨 3. UI Layer（Vue / Composables）

### 🎯 責任

- 使用者輸入（掃碼 / 點擊）
- 顯示資料
- 呼叫 Application

👉 UI = Shell（外殼）

### 📁 對應目錄

```text
src/pages/
src/ui/
src/components/
```

### 📌 範例

```ts
import { barcodeScanUseCase } from '@/application/barcode-scan/BarcodeScanUseCase'

export function useScanFlow() {
  async function onScan(code: string) {
    return await barcodeScanUseCase(code)
  }

  return { onScan }
}
```

---

## 🌐 4. Infrastructure Layer（API / Repository）

### 🎯 責任

- API 呼叫
- Repository 實作
- 資料來源（HTTP / LocalStorage）

### 📁 對應目錄

```text
src/infra/
src/infrastructure/
src/client/
```

### 📌 範例

```ts
export const materialApi = {
  async getMaterial(id: string) {
    return fetch(`/api/material/${id}`).then(r => r.json())
  }
}
```

---

## 🧪 Testing Strategy

### Domain（重點）

- Vitest
- 測所有規則

```ts
test('invalid barcode', () => {
  expect(validateBarcode('')).toBe(false)
})
```

### Application

- 測流程
- mock API

### UI

- Playwright
- 測操作流程

---

## 📁 專案結構（實際）

```text
src/
├── domain/
├── application/
├── infra/
├── infrastructure/
├── client/
├── stores/
├── ui/
├── pages/
```

---

## 🧩 設計原則

### 1️⃣ Domain 最穩定

- 不應頻繁修改
- 可搬到 backend

### 2️⃣ Application 是唯一入口

👉 所有流程都必須經過 UseCase

### 3️⃣ UI 不包含業務邏輯

### 4️⃣ 禁止跨層

```text
❌ UI → Domain
❌ Domain → API
❌ Domain → Store
```

---

## 🚀 優點

- 易測試
- 易重構
- 易擴展
- 可後端共享

---

## ⚠️ 常見錯誤（務必避免）

### ❌ Layer Violations

- UI 直接打 API
- Domain 寫業務流程
- Business logic 散落各層

---

## 🔄 未來演進（強烈建議）

### 1️⃣ 導入 State Machine（關鍵）

```text
Application/
  ├── UseCase
  ├── Flow（State Machine）
```

👉 適用場景：

- 掃碼流程
- 換料流程
- 生產狀態

### 2️⃣ Domain 抽成 package

```text
/packages/domain
```

### 3️⃣ Dependency Injection

```ts
createPanasonicWorkflowDeps.ts
```

---

## 🔥 最重要規則（給 AI / 開發者）

👉 業務規則只能在 Domain  
👉 流程控制只能在 Application  
👉 UI 不可以有邏輯  

違反以上規則 = 架構錯誤
