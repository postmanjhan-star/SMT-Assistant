# Operation Mode State Machine

`operationModeStateMachine` 管理 Fuji / Panasonic 生產頁面的操作模式，
用 XState v5 取代原本散落的 `isUnloadMode` / `isIpqcMode` / `unloadReplacePhase` boolean 組合。

## 狀態圖

```mermaid
stateDiagram-v2
    [*] --> NORMAL

    NORMAL --> UNLOAD : ENTER_UNLOAD
    NORMAL --> IPQC   : ENTER_IPQC

    IPQC --> UNLOAD : ENTER_UNLOAD
    IPQC --> NORMAL : ENTER_IPQC (toggle) / EXIT_TO_NORMAL

    state UNLOAD {
        [*] --> ROUTING
        state ROUTING <<choice>>
        ROUTING --> UNLOAD_SCAN     : [pack_auto_slot]
        ROUTING --> FORCE_SLOT_SCAN : [force_single_slot]

        UNLOAD_SCAN     --> REPLACE_MATERIAL_SCAN : UNLOAD_SUBMITTED
        FORCE_SLOT_SCAN --> REPLACE_MATERIAL_SCAN : FORCE_UNLOAD_SUBMITTED

        REPLACE_MATERIAL_SCAN --> REPLACE_SLOT_SCAN : REPLACEMENT_MATERIAL_SCANNED
    }

    REPLACE_SLOT_SCAN --> NORMAL : REPLACE_SLOT_SUBMITTED
    UNLOAD            --> NORMAL : EXIT_TO_NORMAL
    UNLOAD            --> IPQC   : ENTER_IPQC
    UNLOAD            --> UNLOAD : ENTER_UNLOAD (reset context)
```

## 狀態說明

| 狀態 | 說明 |
|---|---|
| `NORMAL` | 預設正常上料接料模式 |
| `IPQC` | IPQC 覆檢模式，掃料確認正確性 |
| `UNLOAD` | 卸料/換料複合狀態 |
| `UNLOAD.UNLOAD_SCAN` | 掃卸除捲號（自動定位站位） |
| `UNLOAD.FORCE_SLOT_SCAN` | 直接掃站位強制卸除 |
| `UNLOAD.REPLACE_MATERIAL_SCAN` | 掃更換捲號 |
| `UNLOAD.REPLACE_SLOT_SCAN` | 掃原站位確認換料完成 |

## Context

```typescript
type OperationModeContext = {
  unloadModeType: "pack_auto_slot" | "force_single_slot"
  resolvedUnloadSlotIdno: string        // UNLOAD_SUBMITTED 後寫入
  replacementMaterialPackCode: string   // REPLACEMENT_MATERIAL_SCANNED 後寫入
}
```

Input form 值（`unloadMaterialValue`、`unloadSlotValue`）不放 context，仍用 Vue `ref` 綁 v-model。

## 觸發碼對應

| 掃碼 | 動作 |
|---|---|
| `S5555` | `ENTER_UNLOAD` modeType=`pack_auto_slot` |
| `S5577` | `ENTER_UNLOAD` modeType=`force_single_slot` |
| `S5588` | `ENTER_IPQC`（再掃一次 toggle 退出） |
| `S5566` | `EXIT_TO_NORMAL` |
| `S1111` | 切換操作員（`handleUserSwitchTrigger`） |
