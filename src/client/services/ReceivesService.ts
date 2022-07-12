/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ReceiveCreate } from '../models/ReceiveCreate';
import type { ReceiveRead } from '../models/ReceiveRead';

import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';

export class ReceivesService {

    /**
     * Get Recent Receives
     * @returns ReceiveRead Successful Response
     * @throws ApiError
     */
    public static getRecentReceives(): CancelablePromise<Array<ReceiveRead>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/receives/',
        });
    }

    /**
     * Create Receive
     * @param requestBody 
     * @returns ReceiveRead Successful Response
     * @throws ApiError
     */
    public static createReceive(
requestBody: ReceiveCreate,
): CancelablePromise<ReceiveRead> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/receives/',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get Receive
     * @param idno 
     * @returns ReceiveRead Successful Response
     * @throws ApiError
     */
    public static getReceive(
idno: string,
): CancelablePromise<ReceiveRead> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/receives/{idno}',
            path: {
                'idno': idno,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

}