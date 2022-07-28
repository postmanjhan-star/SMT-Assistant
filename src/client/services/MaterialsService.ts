/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MaterialCreate } from '../models/MaterialCreate';
import type { MaterialRead } from '../models/MaterialRead';
import type { MaterialStockRecord } from '../models/MaterialStockRecord';
import type { MaterialUpdate } from '../models/MaterialUpdate';

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
     * Get Material In Stock Balance
     * @param idno 
     * @returns number Successful Response
     * @throws ApiError
     */
    public static getMaterialInStockBalance(
idno: string,
): CancelablePromise<number> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/materials/{idno}/stock_balance',
            path: {
                'idno': idno,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get Material Stock Records
     * @param idno 
     * @returns MaterialStockRecord Successful Response
     * @throws ApiError
     */
    public static getMaterialStockRecords(
idno: string,
): CancelablePromise<Array<MaterialStockRecord>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/materials{idno}/stock_records',
            path: {
                'idno': idno,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get Materials
     * @returns MaterialRead Successful Response
     * @throws ApiError
     */
    public static getMaterials(): CancelablePromise<Array<MaterialRead>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/materials/',
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

    /**
     * Update Material
     * @param id 
     * @param requestBody 
     * @returns MaterialRead Successful Response
     * @throws ApiError
     */
    public static updateMaterial(
id: number,
requestBody: MaterialUpdate,
): CancelablePromise<MaterialRead> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/materials/{id}',
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