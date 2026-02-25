/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { IssuanceRead } from '../models/IssuanceRead';
import type { STPart } from '../models/STPart';
import type { STPartPack } from '../models/STPartPack';
import type { STReceiveHeader } from '../models/STReceiveHeader';
import type { STReceivePack } from '../models/STReceivePack';
import type { STVendor } from '../models/STVendor';
import type { STWorkOrder } from '../models/STWorkOrder';
import type { STWorkOrderItem } from '../models/STWorkOrderItem';

import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';

export class StErpService {

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
            url: '/st_erp/parts/{part_idno}',
            path: {
                'part_idno': partIdno,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

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
            url: '/st_erp/parts/pack/{st_pack_idno}',
            path: {
                'st_pack_idno': stPackIdno,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get St Receive List
     * 以日期查 ST ERP 收料單
 *
 * CSV 資料順序：
 *
 * 收料單號^^訂單編號^^材料編號^^廠商編號^^收料日期^^收料數量^^驗收日期^^驗收數量^^隨車單號
 *
 * `idno^^purchase_idno^^part_idno^^vendor_idno^^receive_date^^tatal_qty^^qualify_date^^qualify_qty^^mbr_idno`
     * @returns STReceiveHeader Successful Response
     * @throws ApiError
     */
    public static getStReceiveList({
stReceiveDate = '2026-02-24',
}: {
stReceiveDate?: string,
}): CancelablePromise<Array<STReceiveHeader>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/st_erp/receives/',
            query: {
                'st_receive_date': stReceiveDate,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get St Receive
     * 以 ST ERP 收料單號查收料單
 *
 * CSV 資料順序：
 *
 * 收料單號^^訂單編號^^材料編號^^廠商編號^^收料日期^^收料數量^^驗收日期^^驗收數量^^隨車單號
 *
 * `idno^^purchase_idno^^part_idno^^vendor_idno^^receive_date^^tatal_qty^^qualify_date^^qualify_qty^^mbr_idno`
     * @returns STReceiveHeader Successful Response
     * @throws ApiError
     */
    public static getStReceive({
stReceiveIdno,
}: {
stReceiveIdno: string,
}): CancelablePromise<STReceiveHeader> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/st_erp/receives/{st_receive_idno}',
            path: {
                'st_receive_idno': stReceiveIdno,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get St Erp Receive Packs
     * 抓 ST ERP 一張收料單下的所有單包資料
 *
 * ST ERP 的單包代碼並非收料當下產生，而是要列印的當下才產生，人員有時候會不印、晚印，因此有時候會有收料單，卻查不到單包代碼，此時應該發出 404 或 503 錯誤。
 *
 * CSV 資料順序：
 *
 * 條碼編號^^本包數量^^驗收數量^^本包序號^^總包數^^收料單號^^材料編號^^單位^^廠商編號^^收料日期
 *
 * `pack_idno^^pack_qty^^total_qualify_qty^^pack_sequence_idno^^total_pack_sequence_idno^^receive_id^^part_idno^^unit^^vendor_idno^^receive_date`
     * @returns STReceivePack Successful Response
     * @throws ApiError
     */
    public static getStErpReceivePacks({
stErpReceiveIdno,
}: {
stErpReceiveIdno: string,
}): CancelablePromise<Array<STReceivePack>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/st_erp/receives/{st_erp_receive_idno}/packs',
            path: {
                'st_erp_receive_idno': stErpReceiveIdno,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * @deprecated
     * Get St Receive Pack Barcodes
     * Replaced by `get_st_erp_receive_packs()`
     * @returns string Successful Response
     * @throws ApiError
     */
    public static getStReceivePackBarcodes({
stErpReceiveIdno,
}: {
stErpReceiveIdno: string,
}): CancelablePromise<Array<string>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/st_erp/receives/{st_erp_receive_idno}/barcodes',
            path: {
                'st_erp_receive_idno': stErpReceiveIdno,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get St Erp Receive Pack
     * 抓 ST ERP 特定單包資料，不論收料單號為何。
 *
 * CSV 資料順序：
 *
 * 條碼編號^^本包數量^^驗收數量^^本包序號^^總包數^^收料單號^^材料編號^^單位^^廠商編號^^收料日期
 *
 * `pack_idno^^pack_qty^^total_qualify_qty^^pack_sequence_idno^^total_pack_sequence_idno^^receive_id^^part_idno^^unit^^vendor_idno^^receive_date`
     * @returns STReceivePack Successful Response
     * @throws ApiError
     */
    public static getStErpReceivePack({
stPackIdno,
}: {
stPackIdno: string,
}): CancelablePromise<STReceivePack> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/st_erp/receives/pack/{st_pack_idno}',
            path: {
                'st_pack_idno': stPackIdno,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get St Vendor
     * CSV 資料順序：
 *
 * `廠商編號^^廠商簡稱^^廠商統編`
 *
 * ```
 * idno^^name^^tax_id
 * SA276^^達震^^24423042
 * ```
     * @returns STVendor Successful Response
     * @throws ApiError
     */
    public static getStVendor({
vendorIdno,
}: {
vendorIdno: string,
}): CancelablePromise<STVendor> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/st_erp/vendors/{vendor_idno}',
            path: {
                'vendor_idno': vendorIdno,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get St Work Order List
     * 工令欄位 CSV：
 *
 * 工令編號^^成品編號^^發料日期^^計劃完工日期^^工令數量^^製造部門^^生產線別
 *
 * `work_order_idno^^product_idno^^issue_date^^due_date^^quantity^^production_department^^production_line`
     * @returns STWorkOrder Successful Response
     * @throws ApiError
     */
    public static getStWorkOrderList({
date = '2026-02-24',
}: {
date?: string,
}): CancelablePromise<Array<STWorkOrder>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/st_erp/work_orders/',
            query: {
                'date': date,
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
            url: '/st_erp/work_orders/{work_order_idno}',
            path: {
                'work_order_idno': workOrderIdno,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get St Work Order Items
     * 工令發料欄位 CSV：
 *
 * 工令編號^^成品編號^^材料編號^^應發數量^^實發數量^^欠料數量^^配料位置
 *
 * `work_order_idno^^product_idno^^material_idno^^due_quantity^^issued_quantity^^shortage_quantity^^production_position`
     * @returns STWorkOrderItem Successful Response
     * @throws ApiError
     */
    public static getStWorkOrderItems({
workOrderIdno,
}: {
workOrderIdno: string,
}): CancelablePromise<Array<STWorkOrderItem>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/st_erp/work_orders/{work_order_idno}/items',
            path: {
                'work_order_idno': workOrderIdno,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Convert St Erp Work Order To Wms Issuance
     * @returns IssuanceRead Successful Response
     * @throws ApiError
     */
    public static convertStErpWorkOrderToWmsIssuance({
workOrderIdno,
testingMode,
requestBody,
}: {
workOrderIdno: string,
testingMode?: any,
requestBody?: (STWorkOrder | null),
}): CancelablePromise<IssuanceRead> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/st_erp/work_orders/{work_order_idno}/to-wms-issuance',
            path: {
                'work_order_idno': workOrderIdno,
            },
            query: {
                'testing_mode': testingMode,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }

}
