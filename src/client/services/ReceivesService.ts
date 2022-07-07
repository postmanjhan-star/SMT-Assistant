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

    /**
     * Print Labels Weasyprint
     * @param idno 
     * @returns any Successful Response
     * @throws ApiError
     */
    public static printLabelsWeasyprint(
idno: string,
): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/receives/{idno}_labels/weasyprint',
            path: {
                'idno': idno,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Print Labels Playwright
     * @param idno 
     * @returns any Successful Response
     * @throws ApiError
     */
    public static printLabelsPlaywright(
idno: string,
): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/receives/{idno}_labels/playwright',
            path: {
                'idno': idno,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

}