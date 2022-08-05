/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { IssuanceCreate } from '../models/IssuanceCreate';
import type { IssuanceItem } from '../models/IssuanceItem';
import type { IssuanceItemCreate } from '../models/IssuanceItemCreate';
import type { IssuanceRead } from '../models/IssuanceRead';

import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';

export class IssuancesService {

    /**
     * Get Issuances
     * @returns IssuanceRead Successful Response
     * @throws ApiError
     */
    public static getIssuances(): CancelablePromise<Array<IssuanceRead>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/issuances/',
        });
    }

    /**
     * Get Issuance
     * @param idno 
     * @returns IssuanceRead Successful Response
     * @throws ApiError
     */
    public static getIssuance(
idno: string,
): CancelablePromise<IssuanceRead> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/issuances/{idno}',
            path: {
                'idno': idno,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Create Issuance
     * @param requestBody 
     * @returns IssuanceRead Successful Response
     * @throws ApiError
     */
    public static createIssuance(
requestBody: IssuanceCreate,
): CancelablePromise<IssuanceRead> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/issuances/create',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Create Issuance Item
     * @param idno 
     * @param requestBody 
     * @returns IssuanceItem Successful Response
     * @throws ApiError
     */
    public static createIssuanceItem(
idno: string,
requestBody: Array<IssuanceItemCreate>,
): CancelablePromise<IssuanceItem> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/issuances/{idno}/create',
            path: {
                'idno': idno,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }

}