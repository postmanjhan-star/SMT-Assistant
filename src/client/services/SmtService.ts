/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_upload_fst } from '../models/Body_upload_fst';
import type { Body_upload_mounter_file } from '../models/Body_upload_mounter_file';
import type { Body_upload_panasonic_mounter_csv } from '../models/Body_upload_panasonic_mounter_csv';
import type { FujiMounterFileRead } from '../models/FujiMounterFileRead';
import type { PanasonicMounterFileCreate } from '../models/PanasonicMounterFileCreate';
import type { PanasonicMounterFileItemRead } from '../models/PanasonicMounterFileItemRead';
import type { PanasonicMounterFileRead } from '../models/PanasonicMounterFileRead';
import type { PanasonicMounterMaterialPackCreate } from '../models/PanasonicMounterMaterialPackCreate';
import type { SmtMaterialInventory } from '../models/SmtMaterialInventory';

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
boardside,
}: {
boardside: string,
}): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/smt/get_panasonic_mounter',
            query: {
                'boardside': boardside,
            },
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
     * Get Material Inventory
     * @returns any Successful Response
     * @throws ApiError
     */
    public static materialInventoryForSmt({
materialInventoryIdno,
}: {
materialInventoryIdno: string,
}): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/smt/material_inventory_v2/{material_inventory_idno}',
            path: {
                'material_inventory_idno': materialInventoryIdno,
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
     * @returns FujiMounterFileRead Successful Response
     * @throws ApiError
     */
    public static uploadFst({
formData,
}: {
formData: Body_upload_fst,
}): CancelablePromise<FujiMounterFileRead> {
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
     * Get Panasonic Mounter File List
     * @returns PanasonicMounterFileRead Successful Response
     * @throws ApiError
     */
    public static getPanasonicMounterFileList(): CancelablePromise<Array<PanasonicMounterFileRead>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/smt/panasonic_mounter/files',
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
machineSide?: ('1' | '2' | null),
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

}
