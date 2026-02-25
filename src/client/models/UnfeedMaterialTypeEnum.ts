/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

/**
 * 卸料類型（Unfeed / Unload）
 *
 * - NORMAL_UNFEED:
 * 正常卸料（生產結束 / 換工單 / 換線）
 *
 * - PARTIAL_UNFEED:
 * 未用完卸料（部分殘料回收）
 *
 * - DEFECT_UNFEED:
 * 不良卸料（物料異常 / 損壞 / NG）
 *
 * - SCRAP_UNFEED:
 * 報廢卸料（直接報廢，不再使用）
 */
export enum UnfeedMaterialTypeEnum {
    NORMAL_UNFEED = 'NORMAL_UNFEED',
    PARTIAL_UNFEED = 'PARTIAL_UNFEED',
    DEFECT_UNFEED = 'DEFECT_UNFEED',
    SCRAP_UNFEED = 'SCRAP_UNFEED',
}
