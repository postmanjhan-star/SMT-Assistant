/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';

export class ReceivesService {

    /**
     * Get Recent Receives
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getRecentReceives(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/receives/',
        });
    }

}