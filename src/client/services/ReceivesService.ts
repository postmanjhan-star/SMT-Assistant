/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { app__routers__receives__Printer } from '../models/app__routers__receives__Printer';
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
     * @param idno Accept `RCV20220729001` and `RAN42204` two types of receving idno.
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

    /**
     * Update Receive
     * @param idno 
     * @param memo 
     * @returns ReceiveRead Successful Response
     * @throws ApiError
     */
    public static updateReceive(
idno: string,
memo: string,
): CancelablePromise<ReceiveRead> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/receives/{idno}',
            path: {
                'idno': idno,
            },
            query: {
                'memo': memo,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get Receive Item Labels
     * @param idno 
     * @param receiveItemId 
     * @param printer 
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getReceiveItemLabels(
idno: string,
receiveItemId: number,
printer?: app__routers__receives__Printer,
): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/receives/{idno}/{receive_item_id}/labels',
            path: {
                'idno': idno,
                'receive_item_id': receiveItemId,
            },
            query: {
                'printer': printer,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

}