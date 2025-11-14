/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { STPart } from '../models/STPart';
import type { STPartPack } from '../models/STPartPack';
import type { STWorkOrder } from '../models/STWorkOrder';

import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';

export class StErpV2Service {

    /**
     * Get St Erp Part Pack
     * 資料：
 * 條碼編號 ^^ 本包數量 ^^ 驗收數量 ^^ 本包序號 ^^ 總包數 ^^ 材料編號 ^^ 單位 ^^ 廠商編號 ^^ 製造日期
 * pack_idno^^pack_qty^^total_qualify_qty^^pack_sequence_idno^^total_pack_sequence_idno^^part_idno^^unit^^vendor_idno^^manufacturing_date
     * @returns STPartPack Successful Response
     * @throws ApiError
     */
    public static getStErpPartPack({
stPackIdno,
}: {
stPackIdno: string,
}): CancelablePromise<STPartPack> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/st_erp_v2/parts/pack/{st_pack_idno}',
            path: {
                'st_pack_idno': stPackIdno,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get St Part
     * ## CSV structure:
 *
 * 材料編號^^規格說明1^^規格說明2^^單位^^固定庫位^^儲存位置^^明細位置^^基本包裝量^^Maker 材料編號^^品料類別
 *
 * `idno^^spec_1^^spec_2^^unit^^storage_lv1^^storage_lv2^^storage_lv3^^qty_per_pack^^maker_part_idno^^part_type`
 *
 * ## Part types
 * 0: 虛擬
 * 1: 成品
 * 2: 半成品
 * 3: 客供件
 * 4: 物料，成品的原物料
 * 5: 原料，例如隨貨出的籃子
     * @returns STPart Successful Response
     * @throws ApiError
     */
    public static getStPart({
partIdno,
}: {
partIdno: string,
}): CancelablePromise<STPart> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/st_erp_v2/parts/{part_idno}',
            path: {
                'part_idno': partIdno,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get St Work Order
     * 工令欄位 CSV：
 *
 * 工令編號^^成品編號^^發料日期^^計劃完工日期^^工令數量^^製造部門^^生產線別
 *
 * ```
 * work_order_idno^^product_idno^^issue_date^^due_date^^quantity^^production_department^^production_line
 * HO3499^^40X85-010A-T1^^20221209^^20221213^^500^^VF11^^VMF1
 * ```
     * @returns STWorkOrder Successful Response
     * @throws ApiError
     */
    public static getStWorkOrder({
workOrderIdno,
}: {
workOrderIdno: string,
}): CancelablePromise<STWorkOrder> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/st_erp_v2/work_orders/{work_order_idno}',
            path: {
                'work_order_idno': workOrderIdno,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

}
