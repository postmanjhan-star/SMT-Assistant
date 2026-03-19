// 集中管理所有 UI 訊息字串。靜態訊息用 string，帶參數用函數。

// ── 模式名稱（兩機種共用，取代 5 個散落定義） ──────────────────────────────
export const MODE_NAME_TESTING = "🧪 試產生產模式"
export const MODE_NAME_NORMAL = "✅ 正式生產模式"

// ── 訊息物件 ─────────────────────────────────────────────────────────────────
export const msg = {

  // 輸入驗證類
  input: {
    materialRequired: "請先輸入物料條碼",
    slotRequired: "請輸入槽位",
    stationRequired: "請輸入站位",
  },

  // 槽位操作類
  slot: {
    formatError: "槽位格式錯誤",
    notFound: (slotIdno: string) => `找不到槽位 ${slotIdno}`,
    noMaterialToUnload: (slotIdno: string) => `槽位 ${slotIdno} 無可卸除料號`,
  },

  // 物料操作類
  material: {
    codeNotFound: "查無此物料條碼",
    queryFailed: "物料查詢失敗",
    packCodeMismatch: (scanned: string, expected: string) =>
      `料號不符：掃描 ${scanned}，槽位應為 ${expected}`,
    packCodeMismatchForStation: (slotIdno: string, expectedId: string) =>
      `料號不符：站位 ${slotIdno} 應為 ${expectedId}`,
    packCodeNotInSlotList: (packCode: string, slotIdno: string) =>
      `料號 ${packCode} 不在槽位 ${slotIdno} 的主料或接料清單`,
  },

  // 卸料流程類
  unload: {
    noTargetSlot: "找不到卸料站位，請重新掃描",
    noReplacementCode: "找不到更換捲號，請重新掃描",
    scanOriginalSlot: (slotIdno: string) => `請掃描原卸料站位 ${slotIdno}`,
    success: (packCode: string, slotIdno: string) => `卸料成功：${packCode} @ ${slotIdno}`,
    uploadFailed: "卸料上傳失敗",
  },

  // 接料流程類
  feed: {
    success: (packCode: string, slotIdno: string) => `接料成功：${packCode} @ ${slotIdno}`,
    uploadFailed: "上傳接料資料失敗",
    addSuccess: "新增成功",
  },

  // 生產生命週期類
  production: {
    startedAndUploaded: "開始生產，資料已上傳",
    stopped: "生產已結束",
    uploadFailed: "資料上傳失敗",
    fileLoadFailed: "讀取檔案資料失敗",
    allMaterialReady: "所有物料已完成上料，準備進入正式生產...",
    slotsNotAllBound: "尚有槽位未綁定，不能開始生產",
  },

} as const
