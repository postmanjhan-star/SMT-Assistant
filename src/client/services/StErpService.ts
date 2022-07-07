/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Printer } from '../models/Printer';
import type { STPart } from '../models/STPart';
import type { STReceiveBody } from '../models/STReceiveBody';
import type { STReceiveHeader } from '../models/STReceiveHeader';
import type { STVendor } from '../models/STVendor';

import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';

export class StErpService {

    /**
     * Get St Part
     * @param partIdno 
     * @returns STPart Successful Response
     * @throws ApiError
     */
    public static getStPart(
partIdno: string,
): CancelablePromise<STPart> {
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
     * Get St Receives
     * @returns STReceiveHeader Successful Response
     * @throws ApiError
     */
    public static getStReceives(): CancelablePromise<Array<STReceiveHeader>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/st_erp/receives/',
        });
    }

    /**
     * Get St Receive
     * @param receiveIdno 
     * @returns STReceiveBody Successful Response
     * @throws ApiError
     */
    public static getStReceive(
receiveIdno: string,
): CancelablePromise<STReceiveBody> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/st_erp/receives/{receive_idno}',
            path: {
                'receive_idno': receiveIdno,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Print St Receive Packs Label
     * @param receiveIdno 
     * @param printer 
     * @returns any Successful Response
     * @throws ApiError
     */
    public static printStReceivePacksLabel(
receiveIdno: string,
printer?: Printer,
): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/st_erp/receives/{receive_idno}/packs_label',
            path: {
                'receive_idno': receiveIdno,
            },
            query: {
                'printer': printer,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get St Vendor
     * @param vendorIdno 
     * @returns STVendor Successful Response
     * @throws ApiError
     */
    public static getStVendor(
vendorIdno: string,
): CancelablePromise<STVendor> {
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

}