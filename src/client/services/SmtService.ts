/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_upload_fst } from '../models/Body_upload_fst';
import type { Body_upload_panasonic_mounter_csv } from '../models/Body_upload_panasonic_mounter_csv';
import type { FujiMounterFileRead } from '../models/FujiMounterFileRead';
import type { PanasonicMounterFileRead } from '../models/PanasonicMounterFileRead';
import type { SmtMaterialInventory } from '../models/SmtMaterialInventory';

import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';

export class SmtService {

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
     * Get Fuji Mounter Material Slot Pairs By Work Order
     * @returns FujiMounterFileRead Successful Response
     * @throws ApiError
     */
    public static getFujiMounterMaterialSlotPairsByWorkOrder({
workOrderIdno,
mounterIdno,
}: {
workOrderIdno: string,
mounterIdno?: string,
}): CancelablePromise<Array<FujiMounterFileRead>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/smt/fuji_mounter/{work_order_idno}',
            path: {
                'work_order_idno': workOrderIdno,
            },
            query: {
                'mounter_idno': mounterIdno,
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
 * 生产数据: 40X85-009B-T2
 * 描述:
 * 产品: 40X85-009B-T2-TOP
 *
 * 供料器设置
 * 机器编号,机器名,工作台,插槽,子插槽,元件,供应,贴装点,"40X85-009B-T2-TOP参考编号",元件说明,替代元件,薄型单式,供料器类型
 * 1,"A-NPM-W2-8+16",1,10010,L,"45110-020F-50",P0804_S,3,"NTC1,NTC2,NTC3","0805/SDNT2012X103F3950FTF","",,双
 * 1,"A-NPM-W2-8+16",2,20019,,"8825K-0002-S0",E1608_S,6,"D10,D11,D12,D13,D14,D15","5.0SMDJ130CA/DO-214A","",,单
 * ,,,,,"321-208P01-S0",E3220_L,3,"P1,P2,P3","2.54×2.54/高18mm/2×4,SMT排针",""
 *
 * ```
     * @returns PanasonicMounterFileRead Successful Response
     * @throws ApiError
     */
    public static uploadPanasonicMounterCsv({
formData,
}: {
formData: Body_upload_panasonic_mounter_csv,
}): CancelablePromise<PanasonicMounterFileRead> {
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
machineSide,
}: {
workOrderIdno: string,
mounterIdno: string,
boardSide?: string,
machineSide?: string,
}): CancelablePromise<Array<PanasonicMounterFileRead>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/smt/panasonic_mounter/{mounter_idno}/{work_order_idno}',
            path: {
                'work_order_idno': workOrderIdno,
                'mounter_idno': mounterIdno,
            },
            query: {
                'board_side': boardSide,
                'machine_side': machineSide,
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
    public static getMaterialInventory({
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

}
