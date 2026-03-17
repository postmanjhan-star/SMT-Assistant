/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { VendorCreate } from '../models/VendorCreate';
import type { VendorRead } from '../models/VendorRead';
import type { VendorUpdate } from '../models/VendorUpdate';

import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';

export class VendorsService {

    /**
     * Get Vendors
     * @returns VendorRead Successful Response
     * @throws ApiError
     */
    public static getVendors(): CancelablePromise<Array<VendorRead>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/vendors/',
        });
    }

    /**
     * Create Vendor
     * @returns VendorRead Successful Response
     * @throws ApiError
     */
    public static createVendor({
        requestBody,
    }: {
        requestBody: VendorCreate,
    }): CancelablePromise<VendorRead> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/vendors/',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get Vendor
     * @returns VendorRead Successful Response
     * @throws ApiError
     */
    public static getVendor({
        idno,
    }: {
        idno: string,
    }): CancelablePromise<VendorRead> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/vendors/{idno}',
            path: {
                'idno': idno,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Update Vendor
     * @returns VendorRead Successful Response
     * @throws ApiError
     */
    public static updateVendor({
        id,
        requestBody,
    }: {
        id: number,
        requestBody: VendorUpdate,
    }): CancelablePromise<VendorRead> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/vendors/{id}',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }

}
