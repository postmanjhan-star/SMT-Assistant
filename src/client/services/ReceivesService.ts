/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Printer } from '../models/Printer';
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
     * @returns ReceiveRead Successful Response
     * @throws ApiError
     */
    public static createReceive({
requestBody,
}: {
requestBody: ReceiveCreate,
}): CancelablePromise<ReceiveRead> {
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
     * @returns ReceiveRead Successful Response
     * @throws ApiError
     */
    public static getReceive({
receiveIdno,
}: {
/**
 * Accept `RCV20220729001` and `RAN42204` two types of receving idno.
 */
receiveIdno: string,
}): CancelablePromise<ReceiveRead> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/receives/{receive_idno}',
            path: {
                'receive_idno': receiveIdno,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Update Receive
     * @returns ReceiveRead Successful Response
     * @throws ApiError
     */
    public static updateReceive({
receiveIdno,
memo,
}: {
receiveIdno: string,
memo: string,
}): CancelablePromise<ReceiveRead> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/receives/{receive_idno}',
            path: {
                'receive_idno': receiveIdno,
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
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getReceiveItemLabels({
receiveIdno,
receiveItemId,
printer,
}: {
receiveIdno: string,
receiveItemId: number,
printer?: Printer,
}): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/receives/{receive_idno}/{receive_item_id}/labels',
            path: {
                'receive_idno': receiveIdno,
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
