/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BarcodeLoginRequest } from '../models/BarcodeLoginRequest';
import type { Body_upload_fst } from '../models/Body_upload_fst';
import type { Body_upload_mounter_file } from '../models/Body_upload_mounter_file';
import type { Body_upload_panasonic_mounter_csv } from '../models/Body_upload_panasonic_mounter_csv';
import type { CheckMaterialMatchEnum } from '../models/CheckMaterialMatchEnum';
import type { FeedMaterialTypeEnum } from '../models/FeedMaterialTypeEnum';
import type { FujiFeedRecordCreate } from '../models/FujiFeedRecordCreate';
import type { FujiItemStatFeedLogRead } from '../models/FujiItemStatFeedLogRead';
import type { FujiMounterFileItemRead } from '../models/FujiMounterFileItemRead';
import type { FujiMounterFileRead } from '../models/FujiMounterFileRead';
import type { FujiMounterFileReadLegacy } from '../models/FujiMounterFileReadLegacy';
import type { FujiMounterItemStatCreate } from '../models/FujiMounterItemStatCreate';
import type { FujiMounterItemStatRead } from '../models/FujiMounterItemStatRead';
import type { OperatorChangePasswordRequest } from '../models/OperatorChangePasswordRequest';
import type { OperatorSwitchResponse } from '../models/OperatorSwitchResponse';
import type { OperatorSyncResponse } from '../models/OperatorSyncResponse';
import type { PanasonicFeedRecordCreate } from '../models/PanasonicFeedRecordCreate';
import type { PanasonicItemStatFeedLogRead } from '../models/PanasonicItemStatFeedLogRead';
import type { PanasonicMounterFileCreate } from '../models/PanasonicMounterFileCreate';
import type { PanasonicMounterFileItemRead } from '../models/PanasonicMounterFileItemRead';
import type { PanasonicMounterFileRead } from '../models/PanasonicMounterFileRead';
import type { PanasonicMounterItemStatCreate } from '../models/PanasonicMounterItemStatCreate';
import type { PanasonicMounterItemStatRead } from '../models/PanasonicMounterItemStatRead';
import type { PanasonicMounterMaterialPackCreate } from '../models/PanasonicMounterMaterialPackCreate';
import type { Printer } from '../models/Printer';
import type { SmtMaterialInventory } from '../models/SmtMaterialInventory';
import type { Token } from '../models/Token';
import type { UnfeedMaterialTypeEnum } from '../models/UnfeedMaterialTypeEnum';
import type { UnfeedReasonEnum } from '../models/UnfeedReasonEnum';

import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';

export class SmtService {

    /**
     * Upload Mounter File
     * @returns any Successful Response
     * @throws ApiError
     */
    public static uploadMounterFile({
        formData,
    }: {
        formData: Body_upload_mounter_file,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/smt/mounter-file/upload',
            formData: formData,
            mediaType: 'multipart/form-data',
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get Panasonic Mounter
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getPanasonicMounter({
        mounterIdno,
        boardSide,
        productIdno,
        machineSide,
    }: {
        mounterIdno: string,
        boardSide: 'TOP' | 'BOTTOM' | 'DUPLEX',
        productIdno?: (string | null),
        machineSide?: (string | null),
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/smt/get_panasonic_mounter',
            query: {
                'mounter_idno': mounterIdno,
                'board_side': boardSide,
                'product_idno': productIdno,
                'machine_side': machineSide,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Add Panasonic Mounter Item Stat
     * @returns any Successful Response
     * @throws ApiError
     */
    public static addPanasonicMounterItemStat({
        requestBody,
    }: {
        requestBody: PanasonicMounterItemStatCreate,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/smt/panasonic_mounter_item/stat',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Add Panasonic Mounter Item Stats
     * @returns any Successful Response
     * @throws ApiError
     */
    public static addPanasonicMounterItemStats({
        requestBody,
    }: {
        requestBody: Array<PanasonicMounterItemStatCreate>,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/smt/panasonic_mounter_item/stats',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Add Fuji Mounter Item Stats
     * @returns FujiMounterItemStatRead Successful Response
     * @throws ApiError
     */
    public static addFujiMounterItemStats({
        requestBody,
    }: {
        requestBody: Array<FujiMounterItemStatCreate>,
    }): CancelablePromise<Array<FujiMounterItemStatRead>> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/smt/fuji_mounter_item/stats',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Add Panasonic Mounter Item Stat Roll
     * @returns any Successful Response
     * @throws ApiError
     */
    public static addPanasonicMounterItemStatRoll({
        requestBody,
    }: {
        requestBody: PanasonicFeedRecordCreate,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/smt/panasonic_mounter_item/stat/roll',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Add Fuji Mounter Item Stat Roll
     * @returns any Successful Response
     * @throws ApiError
     */
    public static addFujiMounterItemStatRoll({
        requestBody,
    }: {
        requestBody: FujiFeedRecordCreate,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/smt/fuji_mounter_item/stat/roll',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Add Panasonic Material Pack
     * @returns any Successful Response
     * @throws ApiError
     */
    public static addPanasonicMaterialPack({
        requestBody,
    }: {
        requestBody: PanasonicMounterMaterialPackCreate,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/smt/panasonic_mounter_item/material_pack',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get Panasonic Mounter Item
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getPanasonicMounterItem({
        id,
    }: {
        id: number,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/smt/panasonic_mounter_item/{id}',
            path: {
                'id': id,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get Panasonic Item Stats
     * @returns PanasonicMounterItemStatRead Successful Response
     * @throws ApiError
     */
    public static getThePanasonicItemStatsOfProduction({
        uuid,
    }: {
        uuid: string,
    }): CancelablePromise<Array<PanasonicMounterItemStatRead>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/smt/panasonic_mounter_item/stats/{uuid}',
            path: {
                'uuid': uuid,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Update Panasonic Item Stats End Time
     * @returns any Successful Response
     * @throws ApiError
     */
    public static updateTheStatsOfProductionEndTimeRecord({
        uuid,
        endTime,
        unfeedMaterialPackType = 'NORMAL_UNFEED',
        unfeedReason,
    }: {
        uuid: string,
        endTime?: (string | null),
        unfeedMaterialPackType?: UnfeedMaterialTypeEnum,
        unfeedReason?: (UnfeedReasonEnum | null),
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/smt/panasonic_mounter_item/stats/{uuid}',
            path: {
                'uuid': uuid,
            },
            query: {
                'end_time': endTime,
                'unfeed_material_pack_type': unfeedMaterialPackType,
                'unfeed_reason': unfeedReason,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get Fuji Item Stats
     * @returns FujiMounterItemStatRead Successful Response
     * @throws ApiError
     */
    public static getTheFujiItemStatsOfProduction({
        uuid,
    }: {
        uuid: string,
    }): CancelablePromise<Array<FujiMounterItemStatRead>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/smt/fuji_mounter_item/stats/{uuid}',
            path: {
                'uuid': uuid,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Update Fuji Item Stats End Time
     * @returns any Successful Response
     * @throws ApiError
     */
    public static updateFujiItemStatsEndTime({
        uuid,
        endTime,
        unfeedMaterialPackType = 'NORMAL_UNFEED',
        unfeedReason,
    }: {
        uuid: string,
        endTime?: (string | null),
        unfeedMaterialPackType?: UnfeedMaterialTypeEnum,
        unfeedReason?: (UnfeedReasonEnum | null),
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/smt/fuji_mounter_item/stats/{uuid}',
            path: {
                'uuid': uuid,
            },
            query: {
                'end_time': endTime,
                'unfeed_material_pack_type': unfeedMaterialPackType,
                'unfeed_reason': unfeedReason,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get Panasonic Item Stats Log By Uuid
     * @returns PanasonicItemStatFeedLogRead Successful Response
     * @throws ApiError
     */
    public static getTheStatsOfLogsByUuid({
        uuid,
        feedPackType,
        checkPackCode,
    }: {
        uuid: string,
        feedPackType?: (FeedMaterialTypeEnum | null),
        checkPackCode?: (CheckMaterialMatchEnum | null),
    }): CancelablePromise<Array<PanasonicItemStatFeedLogRead>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/smt/panasonic_mounter_item/stats/logs/{uuid}',
            path: {
                'uuid': uuid,
            },
            query: {
                'feed_pack_type': feedPackType,
                'check_pack_code': checkPackCode,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get Fuji Item Stats Log By Uuid
     * @returns FujiItemStatFeedLogRead Successful Response
     * @throws ApiError
     */
    public static getTheFujiStatsOfLogsByUuid({
        uuid,
        feedPackType,
        checkPackCode,
    }: {
        uuid: string,
        feedPackType?: (FeedMaterialTypeEnum | null),
        checkPackCode?: (CheckMaterialMatchEnum | null),
    }): CancelablePromise<Array<FujiItemStatFeedLogRead>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/smt/fuji_mounter_item/stats/logs/{uuid}',
            path: {
                'uuid': uuid,
            },
            query: {
                'feed_pack_type': feedPackType,
                'check_pack_code': checkPackCode,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get Panasonic Mounter File List
     * @returns PanasonicMounterFileRead Successful Response
     * @throws ApiError
     */
    public static getPanasonicMounterFileList({
        mounterIdno,
        boardSide = 'DUPLEX',
        productIdno,
    }: {
        mounterIdno?: (string | null),
        boardSide?: 'TOP' | 'BOTTOM' | 'DUPLEX',
        productIdno?: (string | null),
    }): CancelablePromise<Array<PanasonicMounterFileRead>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/smt/panasonic_mounter/files',
            query: {
                'mounter_idno': mounterIdno,
                'board_side': boardSide,
                'product_idno': productIdno,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get Fuji Mounter File List
     * @returns FujiMounterFileRead Successful Response
     * @throws ApiError
     */
    public static getFujiMounterFileList({
        mounterIdno,
        boardSide,
        productIdno,
    }: {
        mounterIdno?: (string | null),
        boardSide?: (string | null),
        productIdno?: (string | null),
    }): CancelablePromise<Array<FujiMounterFileRead>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/smt/fuji_mounter/files',
            query: {
                'mounter_idno': mounterIdno,
                'board_side': boardSide,
                'product_idno': productIdno,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Find Panasonic Mounter Idnos By Product Idno
     * @returns string Successful Response
     * @throws ApiError
     */
    public static findPanasonicMounterIdnosByProductIdno({
        productIdno,
    }: {
        productIdno: string,
    }): CancelablePromise<Array<string>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/smt/panasonic_mounter/files/mounter_idnos/{product_idno}',
            path: {
                'product_idno': productIdno,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Find Fuji Mounter Idnos By Product Idno
     * @returns string Successful Response
     * @throws ApiError
     */
    public static findFujiMounterIdnosByProductIdno({
        productIdno,
    }: {
        productIdno: string,
    }): CancelablePromise<Array<string>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/smt/fuji_mounter/files/mounter_idnos/{product_idno}',
            path: {
                'product_idno': productIdno,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get Fuji Mounter File Item List
     * @returns FujiMounterFileItemRead Successful Response
     * @throws ApiError
     */
    public static getFujiMounterFileItemList({
        id,
    }: {
        id: number,
    }): CancelablePromise<Array<FujiMounterFileItemRead>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/smt/fuji_mounter/files/{id}/items',
            path: {
                'id': id,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get Panasonic Mounter File Item List
     * @returns PanasonicMounterFileItemRead Successful Response
     * @throws ApiError
     */
    public static getPanasonicMounterFileItemList({
        id,
    }: {
        id: number,
    }): CancelablePromise<Array<PanasonicMounterFileItemRead>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/smt/panasonic_mounter/files/{id}/items',
            path: {
                'id': id,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get Panasonic Mounter Material Slot Pairs
     * @returns PanasonicMounterFileRead Successful Response
     * @throws ApiError
     */
    public static getPanasonicMounterMaterialSlotPairs({
        workOrderIdno,
        mounterIdno,
        boardSide,
        productIdno,
        machineSide,
        testingMode = false,
        testingProductIdno,
    }: {
        workOrderIdno: string,
        mounterIdno: string,
        boardSide: 'TOP' | 'BOTTOM' | 'DUPLEX',
        productIdno?: (string | null),
        machineSide?: ('1' | '2' | '1+2' | null),
        testingMode?: boolean,
        testingProductIdno?: (string | null),
    }): CancelablePromise<PanasonicMounterFileRead> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/smt/panasonic_mounter/{mounter_idno}/{work_order_idno}',
            path: {
                'work_order_idno': workOrderIdno,
                'mounter_idno': mounterIdno,
            },
            query: {
                'board_side': boardSide,
                'product_idno': productIdno,
                'machine_side': machineSide,
                'testing_mode': testingMode,
                'testing_product_idno': testingProductIdno,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Delete Panasonic Mounter File
     * @returns boolean Successful Response
     * @throws ApiError
     */
    public static deletePanasonicMounterFile({
        id,
    }: {
        id: number,
    }): CancelablePromise<boolean> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/smt/panasonic_mounter/files/{id}',
            path: {
                'id': id,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Delete Fuji Mounter File
     * @returns boolean Successful Response
     * @throws ApiError
     */
    public static deleteFujiMounterFile({
        id,
    }: {
        id: number,
    }): CancelablePromise<boolean> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/smt/fuji_mounter/files/{id}',
            path: {
                'id': id,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get Fuji Mounter Material Slot Pairs
     * @returns FujiMounterFileRead Successful Response
     * @throws ApiError
     */
    public static getFujiMounterMaterialSlotPairs({
        workOrderIdno,
        boardSide,
        productIdno,
        mounterIdno,
        testingMode = false,
        testingProductIdno,
    }: {
        workOrderIdno: string,
        boardSide: 'TOP' | 'BOTTOM' | 'DUPLEX',
        productIdno?: (string | null),
        mounterIdno?: (string | null),
        testingMode?: boolean,
        testingProductIdno?: (string | null),
    }): CancelablePromise<Array<FujiMounterFileRead>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/smt/fuji_mounter/{work_order_idno}',
            path: {
                'work_order_idno': workOrderIdno,
            },
            query: {
                'board_side': boardSide,
                'product_idno': productIdno,
                'mounter_idno': mounterIdno,
                'testing_mode': testingMode,
                'testing_product_idno': testingProductIdno,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Sync Eform Operators
     * @returns OperatorSyncResponse Successful Response
     * @throws ApiError
     */
    public static syncEformOperators({
        format = 'json',
    }: {
        format?: 'json' | 'csv',
    }): CancelablePromise<OperatorSyncResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/smt/operator/sync',
            query: {
                'format': format,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Operator Barcode Login
     * @returns Token Successful Response
     * @throws ApiError
     */
    public static operatorBarcodeLogin({
        requestBody,
    }: {
        requestBody: BarcodeLoginRequest,
    }): CancelablePromise<Token> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/smt/operator/barcode-login',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Operator Switch User
     * @returns OperatorSwitchResponse Successful Response
     * @throws ApiError
     */
    public static operatorSwitchUser({
        requestBody,
    }: {
        requestBody: BarcodeLoginRequest,
    }): CancelablePromise<OperatorSwitchResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/smt/operator/switch',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Operator Change Password
     * @returns void
     * @throws ApiError
     */
    public static operatorChangePasswordSmtOperatorChangePasswordPost({
        requestBody,
    }: {
        requestBody: OperatorChangePasswordRequest,
    }): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/smt/operator/change-password',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Generate Operator Qrcodes
     * @returns any Successful Response
     * @returns binary Created
     * @throws ApiError
     */
    public static generateOperatorQrcodes({
        workIds,
        printer = 'weasyprint',
    }: {
        workIds: Array<number>,
        printer?: Printer,
    }): CancelablePromise<any | Blob> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/smt/operator/qrcodes',
            query: {
                'work_ids': workIds,
                'printer': printer,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get Material Inventory
     * @returns SmtMaterialInventory Successful Response
     * @throws ApiError
     */
    public static getMaterialInventoryForSmt({
        materialInventoryIdno,
    }: {
        materialInventoryIdno: string,
    }): CancelablePromise<SmtMaterialInventory> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/smt/material_inventory/{material_inventory_idno}',
            path: {
                'material_inventory_idno': materialInventoryIdno,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Upload Fst
     * 40X980123-T1-XP1B1-T.fst
     * @returns FujiMounterFileReadLegacy Successful Response
     * @throws ApiError
     */
    public static uploadFst({
        formData,
    }: {
        formData: Body_upload_fst,
    }): CancelablePromise<FujiMounterFileReadLegacy> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/smt/fuji_mounter/upload_fst',
            formData: formData,
            mediaType: 'multipart/form-data',
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Upload Panasonic Mounter Csv
     * 從檔案的 metadata 區讀取表頭資料
     *
     * 範例：
     *
     * ```
     *
     * ```
     *
     * 另一種 top / bottom 混合的格式範例:
     *
     * ```
     * 生产数据: 40Y85-010A-T2-B+T
     * 描述:
     * 产品: 40Y85-010A-T2-BOT
     * 产品: 40Y85-010A-T2-TOP
     *
     * 供料器设置
     * 机器编号,机器名,工作台,插槽,子插槽,元件,供应,贴装点,"40Y85-010A-T2-BOT","40Y85-010A-T2-TOP","40Y85-010A-T2-BOT参考编号","40Y85-010A-T2-TOP参考编号",元件说明,替代元件,薄型单式,供料器类型
     * 1,"A1-NPM-W2-8+16",1,10007,L,"88120-0001-S0",E0804_S,28,0,28,"","TVS200,TVS201,TVS202,TVS401,TVS402,TVS404,TVS405","SMF16A-MS-H","",,双
     * 1,"A1-NPM-W2-8+16",1,10007,R,"43010-630K-60",E0804_S,104,32,72,"C2,C3,C400,C401,C402,C403,C417,C418","C500,C501,C502,C509,C510,C511,C513,C514,C515,C521,C522,C523,C525,C526,C527,C533,C534,C535","1206/10uF/25V/X7R","",,双
     * 1,"A1-NPM-W2-8+16",2,21001,,"90100-0002-S1",托盘,4,0,4,"","U2","R7F7016944AFP/QFP48","",
     * ```
     * @returns PanasonicMounterFileCreate Successful Response
     * @throws ApiError
     */
    public static uploadPanasonicMounterCsv({
        formData,
    }: {
        formData: Body_upload_panasonic_mounter_csv,
    }): CancelablePromise<Array<PanasonicMounterFileCreate>> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/smt/panasonic_mounter/upload_csv',
            formData: formData,
            mediaType: 'multipart/form-data',
            errors: {
                422: `Validation Error`,
            },
        });
    }

}
