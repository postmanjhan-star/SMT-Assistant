/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MaterialCreate } from '../models/MaterialCreate';
import type { MaterialRead } from '../models/MaterialRead';

import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';

export class MaterialsService {

    /**
     * Get Material
     * @param idno
     * @returns MaterialRead Successful Response
     * @throws ApiError
     */
    public static getMaterial(
        idno: string,
    ): CancelablePromise<MaterialRead> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/materials/{idno}',
            path: {
                'idno': idno,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Create Material
     * @param requestBody
     * @returns MaterialRead Successful Response
     * @throws ApiError
     */
    public static createMaterial(
        requestBody: MaterialCreate,
    ): CancelablePromise<MaterialRead> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/materials/',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }

}