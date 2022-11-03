/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_upload_fst } from '../models/Body_upload_fst';
import type { FujiMounterFileRead } from '../models/FujiMounterFileRead';

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

}
