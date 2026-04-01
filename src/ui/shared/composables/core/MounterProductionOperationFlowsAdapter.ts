// ─────────────────────────────────────────────────────────────────────────────
// Production operation flows adapter interface
//
// 與 MounterOperationFlowsAdapter（preproduction 用）分開，因為生產模式不需要
// build*Record 方法（記錄是即時 API 提交，不累積），而需要 submitIpqcRow（即時巡檢）。
// ─────────────────────────────────────────────────────────────────────────────

export type MounterProductionOperationFlowsAdapter = {
  // ── Row keying ─────────────────────────────────────────────────────────────
  /** IPQC saved state Map 的 key（通常是 slot 組合字串） */
  toRowKey(row: any): string
  /** 用於 state machine transition 的 slot id 字串 */
  toRowSlotIdno(row: any): string

  // ── Grid / Column API ──────────────────────────────────────────────────────
  /** 更新單行或多行（applyTransaction update） */
  applyGridTransaction(update: any[]): void
  /** 設定欄位顯示/隱藏 */
  setColumnVisible(colId: string, visible: boolean): void
  /** 切換 IPQC 模式時隱藏/顯示正常欄位（可選，Fuji 需要） */
  toggleNormalColumnsForIpqc?(visible: boolean): void

  // ── Slot parsing ───────────────────────────────────────────────────────────
  /** 從掃描字串找到對應的 row（含品牌專屬解析邏輯） */
  findRowBySlotInput(slotIdno: string, rowData: any[]): any | null
  /** 判斷掃描輸入是否與目標 slot id 相符 */
  slotsMatch(inputRaw: string, targetSlotIdno: string): boolean

  // ── IPQC 即時上傳 ──────────────────────────────────────────────────────────
  /**
   * 即時上傳 IPQC 巡檢記錄（品牌專屬 API params 在實作內處理）。
   * 實作需自行 try/catch，決定是否 showError 或靜默失敗。
   */
  submitIpqcRow(row: any, materialPackCode: string, operatorIdno: string | null): Promise<void>

  /**
   * IPQC slot 送出後的品牌額外欄位更新（可選）。
   * 例如 Panasonic 需要更新 row.remark = `巡檢 N 次`。
   * 在 applyGridTransaction 之前呼叫，讓額外欄位也反映在 grid 上。
   */
  afterIpqcRowUpdate?(row: any): void
}
