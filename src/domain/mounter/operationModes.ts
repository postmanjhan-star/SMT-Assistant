// 操作觸發碼（掃描條碼觸發模式切換）
export const MATERIAL_UNLOAD_TRIGGER = "S5555" // 換料卸除（pack_auto_slot）
export const MATERIAL_EXIT_TRIGGER = "S5566" // 退出 IPQC 模式
export const MATERIAL_FORCE_UNLOAD_TRIGGER = "S5577" // 單站卸除（force_single_slot）
export const MATERIAL_IPQC_TRIGGER = "S5588" // IPQC 覆檢開關

// 操作模式顯示文字
export const MATERIAL_UNLOAD_MODE_NAME = "🔄換料卸除"
export const MATERIAL_FORCE_UNLOAD_MODE_NAME = "⏏️單站卸除"
export const MATERIAL_IPQC_MODE_NAME = "🔍IPQC覆檢"
export const MATERIAL_FEED_MODE_NAME = "📥上料接料"
