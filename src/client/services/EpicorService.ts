/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EpicorReceive } from '../models/EpicorReceive';

import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';

export class EpicorService {

    /**
     * Get Receives
     * @returns EpicorReceive Successful Response
     * @throws ApiError
     */
    public static getReceives(): CancelablePromise<Array<EpicorReceive>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/epicor/receives',
        });
    }

    /**
     * Get Receive
     * @param vendorNum 
     * @param packSlip 
     * @returns EpicorReceive Successful Response
     * @throws ApiError
     */
    public static getReceive(
vendorNum: number,
packSlip: string,
): CancelablePromise<EpicorReceive> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/epicor/receives/{vendor_num}/{pack_slip}',
            path: {
                'vendor_num': vendorNum,
                'pack_slip': packSlip,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

}