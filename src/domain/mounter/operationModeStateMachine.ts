import { assertEvent, assign, setup } from 'xstate'

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────

export type UnloadModeType = "pack_auto_slot" | "force_single_slot"

export type OperationModeContext = {
  unloadModeType: UnloadModeType
  resolvedUnloadSlotIdno: string
  replacementMaterialPackCode: string
  spliceSlotIdno: string
  spliceNewPackCode: string
}

export type OperationModeEvent =
  | { type: "LOGGED_IN" }
  | { type: "LOGGED_OUT" }
  | { type: "ENTER_UNLOAD"; modeType: UnloadModeType }
  | { type: "ENTER_IPQC" }
  | { type: "ENTER_SPLICE" }
  | { type: "EXIT_TO_NORMAL" }
  | { type: "UNLOAD_SUBMITTED"; resolvedSlotIdno: string }
  | { type: "FORCE_UNLOAD_SUBMITTED"; resolvedSlotIdno: string }
  | { type: "REPLACEMENT_MATERIAL_SCANNED"; packCode: string }
  | { type: "REPLACE_SLOT_SUBMITTED" }
  | { type: "SPLICE_CURRENT_SCANNED"; resolvedSlotIdno: string }
  | { type: "SPLICE_NEW_SCANNED"; packCode: string }
  | { type: "SPLICE_SLOT_SUBMITTED" }

// ────────────────────────────────────────────────────────────────
// Machine
// ────────────────────────────────────────────────────────────────

export const operationModeStateMachine = setup({
  types: {
    context: {} as OperationModeContext,
    events: {} as OperationModeEvent,
  },
  actions: {
    resetContext: assign({
      unloadModeType: "pack_auto_slot" as UnloadModeType,
      resolvedUnloadSlotIdno: "",
      replacementMaterialPackCode: "",
      spliceSlotIdno: "",
      spliceNewPackCode: "",
    }),
    assignEnterUnload: assign(({ event }) => {
      assertEvent(event, "ENTER_UNLOAD")
      return {
        unloadModeType: event.modeType,
        resolvedUnloadSlotIdno: "",
        replacementMaterialPackCode: "",
      }
    }),
    assignUnloadSubmitted: assign(({ event }) => {
      assertEvent(event, "UNLOAD_SUBMITTED")
      return { resolvedUnloadSlotIdno: event.resolvedSlotIdno }
    }),
    assignForceUnloadSubmitted: assign(({ event }) => {
      assertEvent(event, "FORCE_UNLOAD_SUBMITTED")
      return { resolvedUnloadSlotIdno: event.resolvedSlotIdno }
    }),
    assignReplacementMaterialScanned: assign(({ event }) => {
      assertEvent(event, "REPLACEMENT_MATERIAL_SCANNED")
      return { replacementMaterialPackCode: event.packCode }
    }),
    assignSpliceCurrentScanned: assign(({ event }) => {
      assertEvent(event, "SPLICE_CURRENT_SCANNED")
      return { spliceSlotIdno: event.resolvedSlotIdno }
    }),
    assignSpliceNewScanned: assign(({ event }) => {
      assertEvent(event, "SPLICE_NEW_SCANNED")
      return { spliceNewPackCode: event.packCode }
    }),
    clearSpliceNewPackCode: assign({
      spliceNewPackCode: "",
    }),
  },
  guards: {
    isForceSlot: ({ context }) => context.unloadModeType === "force_single_slot",
    isSameUnloadMode: ({ context, event }) => {
      assertEvent(event, "ENTER_UNLOAD")
      return context.unloadModeType === event.modeType
    },
  },
}).createMachine({
  id: "operationMode",
  initial: "UNAUTHENTICATED",
  context: {
    unloadModeType: "pack_auto_slot",
    resolvedUnloadSlotIdno: "",
    replacementMaterialPackCode: "",
    spliceSlotIdno: "",
    spliceNewPackCode: "",
  },

  states: {
    // ── 未登入 ───────────────────────────────────────────────────
    UNAUTHENTICATED: {
      on: {
        LOGGED_IN: { target: "AUTHENTICATED" },
      },
    },

    // ── 已登入（包含所有操作模式） ───────────────────────────────
    AUTHENTICATED: {
      initial: "NORMAL",
      on: {
        LOGGED_OUT: { target: "UNAUTHENTICATED", actions: "resetContext" },
      },
      states: {
        // ── 上料模式（預設） ───────────────────────────────────────
        NORMAL: {
          on: {
            ENTER_UNLOAD: { target: "UNLOAD", actions: "assignEnterUnload" },
            ENTER_IPQC: { target: "IPQC" },
            ENTER_SPLICE: { target: "SPLICE", actions: "resetContext" },
          },
        },

        // ── IPQC 覆檢模式 ──────────────────────────────────────────
        IPQC: {
          on: {
            ENTER_UNLOAD: { target: "UNLOAD", actions: "assignEnterUnload" },
            ENTER_IPQC: { target: "NORMAL", actions: "resetContext" }, // toggle off
            EXIT_TO_NORMAL: { target: "NORMAL", actions: "resetContext" },
            ENTER_SPLICE: { target: "SPLICE", actions: "resetContext" },
          },
        },

        // ── 接料模式（compound） ───────────────────────────────────
        SPLICE: {
          initial: "SPLICE_IDLE",
          on: {
            ENTER_SPLICE: { target: "NORMAL", actions: "resetContext" },
            EXIT_TO_NORMAL: { target: "NORMAL", actions: "resetContext" },
            ENTER_UNLOAD: { target: "UNLOAD", actions: "assignEnterUnload" },
            ENTER_IPQC: { target: "IPQC", actions: "resetContext" },
          },
          states: {
            SPLICE_IDLE: {
              on: {
                SPLICE_CURRENT_SCANNED: {
                  target: "SPLICE_NEW_SCAN",
                  actions: "assignSpliceCurrentScanned",
                },
              },
            },
            SPLICE_NEW_SCAN: {
              on: {
                SPLICE_NEW_SCANNED: {
                  target: "SPLICE_SLOT_SCAN",
                  actions: "assignSpliceNewScanned",
                },
              },
            },
            SPLICE_SLOT_SCAN: {
              on: {
                SPLICE_SLOT_SUBMITTED: {
                  target: "SPLICE_IDLE",
                  actions: "clearSpliceNewPackCode",
                },
              },
            },
          },
        },

        // ── 卸料/換料模式（compound） ──────────────────────────────
        UNLOAD: {
          // 進入 UNLOAD 時先到 ROUTING，由 always guard 決定走哪條子流程
          initial: "ROUTING",
          on: {
            ENTER_IPQC: { target: "IPQC", actions: "resetContext" },
            EXIT_TO_NORMAL: { target: "NORMAL", actions: "resetContext" },
            ENTER_UNLOAD: [
              { guard: "isSameUnloadMode", target: "NORMAL", actions: "resetContext" },
              { target: "UNLOAD", actions: "assignEnterUnload" },
            ],
            ENTER_SPLICE: { target: "SPLICE", actions: "resetContext" },
          },
          states: {
            // 依 context.unloadModeType 路由到正確的掃描子狀態
            ROUTING: {
              always: [
                { guard: "isForceSlot", target: "FORCE_SLOT_SCAN" },
                { target: "UNLOAD_SCAN" },
              ],
            },

            // pack_auto_slot：掃物料捲號，系統自動定位站位
            UNLOAD_SCAN: {
              on: {
                UNLOAD_SUBMITTED: {
                  target: "REPLACE_MATERIAL_SCAN",
                  actions: "assignUnloadSubmitted",
                },
              },
            },

            // force_single_slot：直接掃站位
            FORCE_SLOT_SCAN: {
              on: {
                FORCE_UNLOAD_SUBMITTED: {
                  target: "REPLACE_MATERIAL_SCAN",
                  actions: "assignForceUnloadSubmitted",
                },
              },
            },

            // 卸除完成，等待掃更換捲號
            REPLACE_MATERIAL_SCAN: {
              on: {
                REPLACEMENT_MATERIAL_SCANNED: {
                  target: "REPLACE_SLOT_SCAN",
                  actions: "assignReplacementMaterialScanned",
                },
              },
            },

            // 掃原站位以確認換料完成
            REPLACE_SLOT_SCAN: {
              on: {
                REPLACE_SLOT_SUBMITTED: {
                  target: "#operationMode.AUTHENTICATED.NORMAL",
                  actions: "resetContext",
                },
              },
            },
          },
        },
      },
    },
  },
})
