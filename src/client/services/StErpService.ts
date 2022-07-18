/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Printer } from '../models/Printer';
import type { STPart } from '../models/STPart';
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
     * @param page 
     * @returns STReceiveHeader Successful Response
     * @throws ApiError
     */
    public static getStReceives(
page: number = 1,
): CancelablePromise<Array<STReceiveHeader>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/st_erp/receives/',
            query: {
                'page': page,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get St Receive
     * @param receiveIdno 
     * @returns STReceiveHeader Successful Response
     * @throws ApiError
     */
    public static getStReceive(
receiveIdno: string,
): CancelablePromise<STReceiveHeader> {
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
     * @param stErpReceiveIdno 
     * @param printer 
     * @returns any Successful Response
     * @throws ApiError
     */
    public static printStReceivePacksLabel(
stErpReceiveIdno: string,
printer?: Printer,
): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/st_erp/receives/{st_erp_receive_idno}/packs_label',
            path: {
                'st_erp_receive_idno': stErpReceiveIdno,
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