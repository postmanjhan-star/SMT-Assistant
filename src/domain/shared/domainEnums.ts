/**
 * Domain-local enum definitions.
 * 值與 @/client 完全相同，讓 domain 層不依賴 @/client。
 * infra 傳入 client enum 值（同字串值），domain 進行比較完全相容。
 */

export enum CheckMaterialMatchEnum {
  MATCHED_MATERIAL_PACK = 'MATCHED_MATERIAL_PACK',
  TESTING_MATERIAL_PACK = 'TESTING_MATERIAL_PACK',
  UNMATCHED_MATERIAL_PACK = 'UNMATCHED_MATERIAL_PACK',
  UNCHECKED_MATERIAL_PACK = 'UNCHECKED_MATERIAL_PACK',
}

/** 上料類型
 * - NEW_MATERIAL_PACK: 新物料
 * - REUSED_MATERIAL_PACK: 上次未用完這次使用的物料
 * - IMPORTED_MATERIAL_PACK: 未標註的物料(第一次上傳的物料)
 * - INSPECTION_MATERIAL_PACK: 巡檢物料
 */
export enum FeedMaterialTypeEnum {
  NEW_MATERIAL_PACK = 'NEW_MATERIAL_PACK',
  REUSED_MATERIAL_PACK = 'REUSED_MATERIAL_PACK',
  IMPORTED_MATERIAL_PACK = 'IMPORTED_MATERIAL_PACK',
  INSPECTION_MATERIAL_PACK = 'INSPECTION_MATERIAL_PACK',
}

/** 物料操作類型：FEED = 上料，UNFEED = 卸料 */
export enum MaterialOperationTypeEnum {
  FEED = 'FEED',
  UNFEED = 'UNFEED',
}

/** 生產模式：NORMAL = 正式，TESTING = 量試 */
export enum ProduceTypeEnum {
  NORMAL_PRODUCE_MODE = 'NORMAL_PRODUCE_MODE',
  TESTING_PRODUCE_MODE = 'TESTING_PRODUCE_MODE',
}

/** 卸料類型 */
export enum UnfeedMaterialTypeEnum {
  NORMAL_UNFEED = 'NORMAL_UNFEED',
  PARTIAL_UNFEED = 'PARTIAL_UNFEED',
  DEFECT_UNFEED = 'DEFECT_UNFEED',
  SCRAP_UNFEED = 'SCRAP_UNFEED',
}

/** 卸料原因 */
export enum UnfeedReasonEnum {
  MATERIAL_FINISHED = 'MATERIAL_FINISHED',
  WRONG_MATERIAL = 'WRONG_MATERIAL',
  CHANGE_ORDER = 'CHANGE_ORDER',
  CHANGE_LINE = 'CHANGE_LINE',
  MATERIAL_DEFECT = 'MATERIAL_DEFECT',
  SCRAP = 'SCRAP',
}
