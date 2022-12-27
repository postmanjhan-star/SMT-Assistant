/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SeastoneSmartRackCellCreateWithoutRackId } from '../models/SeastoneSmartRackCellCreateWithoutRackId';
import type { SeastoneSmartRackCreate } from '../models/SeastoneSmartRackCreate';
import type { SeastoneSmartRackReadWithChildren } from '../models/SeastoneSmartRackReadWithChildren';
import type { SeastoneSmartRackReadWithoutChildren } from '../models/SeastoneSmartRackReadWithoutChildren';
import type { SeastoneSmartRackUpdate } from '../models/SeastoneSmartRackUpdate';

import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';

export class SeastoneService {

    /**
     * Get Get Seastone Smart Rack List
     * @returns SeastoneSmartRackReadWithoutChildren Successful Response
     * @throws ApiError
     */
    public static getGetSeastoneSmartRackList(): CancelablePromise<Array<SeastoneSmartRackReadWithoutChildren>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/seastone_smart_rack/',
        });
    }

    /**
     * Create Seastone Smart Rack
     * Only accept request from SYSTEM_ADMIN
     * @returns SeastoneSmartRackReadWithoutChildren Successful Response
     * @throws ApiError
     */
    public static createSeastoneSmartRack({
requestBody,
}: {
requestBody: SeastoneSmartRackCreate,
}): CancelablePromise<SeastoneSmartRackReadWithoutChildren> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/seastone_smart_rack/',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get Seastone Smart Rack
     * @returns SeastoneSmartRackReadWithChildren Successful Response
     * @throws ApiError
     */
    public static getSeastoneSmartRack({
rackIdno,
}: {
rackIdno: string,
}): CancelablePromise<SeastoneSmartRackReadWithChildren> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/seastone_smart_rack/{rack_idno}',
            path: {
                'rack_idno': rackIdno,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Update Seastone Smart Rack
     * @returns SeastoneSmartRackReadWithChildren Successful Response
     * @throws ApiError
     */
    public static updateSeastoneSmartRack({
rackIdno,
requestBody,
}: {
rackIdno: string,
requestBody: SeastoneSmartRackUpdate,
}): CancelablePromise<SeastoneSmartRackReadWithChildren> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/seastone_smart_rack/{rack_idno}',
            path: {
                'rack_idno': rackIdno,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Create Cell
     * `side`: `0` = front, `1` = back
 *
 * Typically, 0001 ~ 0700 is front, 0701 ~ 1400 is back.
     * @returns boolean Successful Response
     * @throws ApiError
     */
    public static createCell({
rackIdno,
requestBody,
}: {
rackIdno: string,
requestBody: Array<SeastoneSmartRackCellCreateWithoutRackId>,
}): CancelablePromise<boolean> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/seastone_smart_rack/{rack_idno}/create_cell',
            path: {
                'rack_idno': rackIdno,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }

}
