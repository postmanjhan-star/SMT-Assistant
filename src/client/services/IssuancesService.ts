/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { IssuanceCreate } from '../models/IssuanceCreate';
import type { IssuanceItemCreate } from '../models/IssuanceItemCreate';
import type { IssuanceItemRead } from '../models/IssuanceItemRead';
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
     * @param issuanceIdno 
     * @returns IssuanceRead Successful Response
     * @throws ApiError
     */
    public static getIssuance(
issuanceIdno: string,
): CancelablePromise<IssuanceRead> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/issuances/{issuance_idno}',
            path: {
                'issuance_idno': issuanceIdno,
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
     * Create Issuance Items
     * @param issuanceIdno 
     * @param requestBody 
     * @returns IssuanceItemRead Successful Response
     * @throws ApiError
     */
    public static createIssuanceItems(
issuanceIdno: string,
requestBody: Array<IssuanceItemCreate>,
): CancelablePromise<Array<IssuanceItemRead>> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/issuances/{issuance_idno}/create',
            path: {
                'issuance_idno': issuanceIdno,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }

}